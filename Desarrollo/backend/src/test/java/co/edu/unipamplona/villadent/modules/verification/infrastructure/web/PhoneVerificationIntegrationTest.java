package co.edu.unipamplona.villadent.modules.verification.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.error.PhoneNotVerifiedException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.ConsumeVerificationTokenUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.support.CapturingVerificationSender;
import co.edu.unipamplona.villadent.support.PublicBookingTestSupport;
import co.edu.unipamplona.villadent.support.VerificationTestConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@Import({TestcontainersConfiguration.class, VerificationTestConfiguration.class})
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class PhoneVerificationIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final String CODE_REQUESTS = "/api/v1/public/phone-verifications";
    private static final String VERIFY = CODE_REQUESTS + "/verify";
    private static final String PUBLIC_APPOINTMENTS = "/api/v1/public/appointments";
    private static final String STAFF_APPOINTMENTS = "/api/v1/appointments";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CapturingVerificationSender verificationSender;

    @Autowired
    private ConsumeVerificationTokenUseCase consumeVerificationToken;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ScheduleRepository schedules;

    @Autowired
    private ProcedureRepository procedures;

    @Autowired
    private AppointmentRepository appointments;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    @Autowired
    private VerificationCodeRepository verificationCodes;

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private LocalDate nextWorkingDay() {
        LocalDate date = LocalDate.now(Clock.system(BOGOTA)).plusDays(1);
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private Dentist dentist(String name) {
        return dentists.save(Dentist.create(name, "Odontología general", null));
    }

    private void clinicHours(Dentist dentist, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(14, 0), LocalTime.of(18, 0)));
    }

    private Procedure procedure(String name) {
        return procedures.save(Procedure.create(name + " " + UUID.randomUUID(), 30));
    }

    private ResultActions requestCode(String phone, String ip) throws Exception {
        return mockMvc.perform(post(CODE_REQUESTS)
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"%s\"}".formatted(phone)));
    }

    private ResultActions requestCode(String phone) throws Exception {
        return requestCode(phone, PublicBookingTestSupport.randomIp());
    }

    private ResultActions verify(String phone, String code) throws Exception {
        return mockMvc.perform(post(VERIFY)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"phone":"%s","code":"%s"}
                        """.formatted(phone, code)));
    }

    private String tokenFor(String phone) throws Exception {
        return PublicBookingTestSupport.obtainToken(mockMvc, verificationSender, phone);
    }

    private String bookingJson(
            String patientName,
            String phone,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time) {
        return """
                {
                  "patientName": "%s",
                  "patientPhone": "%s",
                  "dentistId": %d,
                  "procedureId": %d,
                  "date": "%s",
                  "time": "%s"
                }
                """.formatted(patientName, phone, dentist.id(), procedure.id(), date, time);
    }

    private String bookingJson(
            String patientName,
            String phone,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String verificationToken) {
        return """
                {
                  "patientName": "%s",
                  "patientPhone": "%s",
                  "dentistId": %d,
                  "procedureId": %d,
                  "date": "%s",
                  "time": "%s",
                  "verificationToken": "%s"
                }
                """.formatted(patientName, phone, dentist.id(), procedure.id(), date, time, verificationToken);
    }

    private List<Appointment> occupying(Dentist dentist, LocalDate date) {
        return appointments.findByDentistIdAndDate(dentist.id(), date).stream()
                .filter(Appointment::occupiesSlot)
                .toList();
    }

    private String tokenForStaff() throws Exception {
        String email = "auxiliar-" + UUID.randomUUID() + "@villadent.co";
        users.save(User.create("Usuario de prueba", email, passwordHasher.hash("clave-segura"), Role.AUXILIAR));
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"clave-segura"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    @Test
    @DisplayName("CP-RF02-04: a correct code returns a token that lets the public booking succeed")
    void correctCodeReturnsTokenAndAllowsPublicBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure procedure = procedure("Limpieza");
        String phone = uniquePhone();

        requestCode(phone).andExpect(status().isAccepted());

        String code = verificationSender.latestCode(phone).orElseThrow();
        MvcResult verified = verify(phone, code)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationToken").isString())
                .andReturn();
        String token = JsonPath.read(verified.getResponse().getContentAsString(), "$.verificationToken");

        mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, procedure, date,
                                LocalTime.of(9, 0), token)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").isString());

        assertThat(occupying(dentist, date)).hasSize(1);
    }

    @Test
    @DisplayName("CP-RF02-05: a wrong code is rejected and the attempt is recorded")
    void wrongCodeIsRejected() throws Exception {
        String phone = uniquePhone();
        requestCode(phone).andExpect(status().isAccepted());
        String code = verificationSender.latestCode(phone).orElseThrow();
        String wrong = code.equals("000000") ? "000001" : "000000";

        verify(phone, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"))
                .andExpect(jsonPath("$.detail").value("El código no es correcto."));

        verify(phone, code).andExpect(status().isOk());
    }

    @Test
    @DisplayName("CP-RF02-07: the third wrong attempt invalidates the code")
    void thirdWrongAttemptInvalidatesTheCode() throws Exception {
        String phone = uniquePhone();
        requestCode(phone).andExpect(status().isAccepted());
        String code = verificationSender.latestCode(phone).orElseThrow();
        String wrong = code.equals("000000") ? "000001" : "000000";

        verify(phone, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"));
        verify(phone, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"));
        verify(phone, wrong)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"))
                .andExpect(jsonPath("$.detail").value(
                        "Superaste los intentos permitidos. Solicita un código nuevo."));

        verify(phone, code)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    @DisplayName("CP-RF02-08: the fourth code for a phone in an hour is rejected")
    void fourthCodeRequestForTheSamePhoneIsRejected() throws Exception {
        String phone = uniquePhone();
        for (int attempt = 0; attempt < 3; attempt++) {
            requestCode(phone).andExpect(status().isAccepted());
        }
        int sentBefore = verificationSender.messages().size();

        requestCode(phone)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_CODE_REQUESTS"))
                .andExpect(jsonPath("$.detail").value(
                        "Has solicitado demasiados códigos. Intenta de nuevo más tarde."));

        assertThat(verificationSender.messages()).hasSize(sentBefore);
    }

    @Test
    @DisplayName("CP-RF02-08: the eleventh code from one client IP in an hour is rejected")
    void eleventhCodeRequestFromTheSameIpIsRejected() throws Exception {
        String ip = PublicBookingTestSupport.randomIp();
        for (int attempt = 0; attempt < 10; attempt++) {
            requestCode(uniquePhone(), ip).andExpect(status().isAccepted());
        }
        int sentBefore = verificationSender.messages().size();

        requestCode(uniquePhone(), ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_CODE_REQUESTS"));

        assertThat(verificationSender.messages()).hasSize(sentBefore);
    }

    @Test
    @DisplayName("CP-RF02-09: booking without a valid token fails and creates no appointment")
    void bookingWithoutValidTokenCreatesNoAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz");
        clinicHours(dentist, date);
        Procedure procedure = procedure("Limpieza");
        String verifiedPhone = uniquePhone();
        String token = tokenFor(verifiedPhone);
        String otherPhone = uniquePhone();

        mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", verifiedPhone, dentist, procedure, date,
                                LocalTime.of(9, 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PHONE_NOT_VERIFIED"))
                .andExpect(jsonPath("$.detail").value(
                        "Verifica tu número de celular para confirmar la cita."));

        mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", otherPhone, dentist, procedure, date,
                                LocalTime.of(9, 0), token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PHONE_NOT_VERIFIED"));

        consumeVerificationToken.consume(token, verifiedPhone);

        mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", verifiedPhone, dentist, procedure, date,
                                LocalTime.of(9, 0), token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PHONE_NOT_VERIFIED"));

        assertThat(occupying(dentist, date)).isEmpty();
    }

    @Test
    @DisplayName("CP-RF02-04: the staff booking still works without a verification token")
    void staffBookingStillWorksWithoutToken() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure procedure = procedure("Limpieza");
        String staffToken = tokenForStaff();

        mockMvc.perform(post(STAFF_APPOINTMENTS)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", uniquePhone(), dentist, procedure, date,
                                LocalTime.of(9, 0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origin").value("MANUAL"));
    }

    @Test
    @DisplayName("CP-RF02-09: a concurrent double booking with one token creates exactly one appointment")
    void concurrentDoubleBookingWithOneTokenCreatesOneAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar");
        clinicHours(dentist, date);
        Procedure procedure = procedure("Limpieza");
        String phone = uniquePhone();
        String token = tokenFor(phone);

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> futures = List.of(
                    executor.submit(() -> bookAfterLatch(start, phone, dentist, procedure, date,
                            LocalTime.of(9, 0), token)),
                    executor.submit(() -> bookAfterLatch(start, phone, dentist, procedure, date,
                            LocalTime.of(10, 0), token)));
            start.countDown();
            List<Integer> statuses = List.of(futures.get(0).get(), futures.get(1).get());

            assertThat(statuses).contains(201);
            assertThat(statuses.stream().filter(status -> status != 201))
                    .allMatch(status -> status == 400 || status == 409);
            assertThat(occupying(dentist, date)).hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("CP-RF02-09: a verification token can be consumed only once under concurrency")
    void verificationTokenIsConsumedOnlyOnceUnderConcurrency() throws Exception {
        String phone = uniquePhone();
        String token = tokenFor(phone);

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Boolean>> futures = List.of(
                    executor.submit(() -> consumeAfterLatch(start, token, phone)),
                    executor.submit(() -> consumeAfterLatch(start, token, phone)));
            start.countDown();

            List<Boolean> results = List.of(futures.get(0).get(), futures.get(1).get());

            assertThat(results).containsExactlyInAnyOrder(true, false);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("CP-RF02-07: concurrent wrong guesses cannot exceed three attempts")
    void concurrentWrongGuessesCannotExceedThreeAttempts() throws Exception {
        String phone = uniquePhone();
        requestCode(phone).andExpect(status().isAccepted());
        String code = verificationSender.latestCode(phone).orElseThrow();
        String wrong = code.equals("000000") ? "000001" : "000000";

        int threads = 10;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            List<Future<String>> futures = new ArrayList<>();
            for (int index = 0; index < threads; index++) {
                futures.add(executor.submit(() -> errorCodeAfterLatch(start, phone, wrong)));
            }
            start.countDown();

            List<String> errorCodes = new ArrayList<>();
            for (Future<String> future : futures) {
                errorCodes.add(future.get());
            }

            PhoneVerificationCode stored = verificationCodes.findLatestByPhone(phone).orElseThrow();
            assertThat(stored.attempts()).isLessThanOrEqualTo(3);
            assertThat(stored.invalidated()).isTrue();
            assertThat(errorCodes.stream().filter("INVALID_CODE"::equals).count()).isLessThanOrEqualTo(2);
            assertThat(errorCodes).doesNotContain("");
        } finally {
            executor.shutdownNow();
        }

        verify(phone, code)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    @DisplayName("CP-RF02-08: concurrent code requests for one phone send at most three codes")
    void concurrentCodeRequestsForOnePhoneSendAtMostThreeCodes() throws Exception {
        String phone = uniquePhone();

        int threads = 10;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int index = 0; index < threads; index++) {
                String ip = PublicBookingTestSupport.randomIp();
                futures.add(executor.submit(() -> statusAfterLatch(start, phone, ip)));
            }
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }

            assertThat(statuses.stream().filter(status -> status == 202).count()).isEqualTo(3);
            assertThat(statuses.stream().filter(status -> status == 429).count()).isEqualTo(7);
        } finally {
            executor.shutdownNow();
        }

        assertThat(verificationSender.messages().stream().filter(sent -> sent.phone().equals(phone)).count())
                .isEqualTo(3);
        assertThat(verificationCodes.countByPhoneSince(phone, Instant.now().minus(1, ChronoUnit.HOURS)))
                .isEqualTo(3);
    }

    @Test
    @DisplayName("CP-RF02-08: concurrent code requests from one IP send at most ten codes")
    void concurrentCodeRequestsFromOneIpSendAtMostTenCodes() throws Exception {
        String ip = PublicBookingTestSupport.randomIp();

        int threads = 15;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int index = 0; index < threads; index++) {
                String phone = uniquePhone();
                futures.add(executor.submit(() -> statusAfterLatch(start, phone, ip)));
            }
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }

            assertThat(statuses.stream().filter(status -> status == 202).count()).isEqualTo(10);
            assertThat(statuses.stream().filter(status -> status == 429).count()).isEqualTo(5);
        } finally {
            executor.shutdownNow();
        }

        assertThat(verificationCodes.countByClientIpSince(ip, Instant.now().minus(1, ChronoUnit.HOURS)))
                .isEqualTo(10);
    }

    @Test
    @DisplayName("CP-RF02-05: a missing code is a wrong code and counts one attempt")
    void missingCodeIsAWrongCodeAndCountsOneAttempt() throws Exception {
        String phone = uniquePhone();
        requestCode(phone).andExpect(status().isAccepted());
        String code = verificationSender.latestCode(phone).orElseThrow();

        mockMvc.perform(post(VERIFY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"%s"}
                                """.formatted(phone)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"))
                .andExpect(jsonPath("$.detail").value("El código no es correcto."));

        mockMvc.perform(post(VERIFY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"%s","code":"   "}
                                """.formatted(phone)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CODE"))
                .andExpect(jsonPath("$.detail").value("El código no es correcto."));

        PhoneVerificationCode stored = verificationCodes.findLatestByPhone(phone).orElseThrow();
        assertThat(stored.attempts()).isEqualTo(2);
        assertThat(stored.invalidated()).isFalse();

        verify(phone, code).andExpect(status().isOk());
    }

    private Integer statusAfterLatch(CountDownLatch start, String phone, String ip) throws Exception {
        start.await();
        return requestCode(phone, ip).andReturn().getResponse().getStatus();
    }

    private String errorCodeAfterLatch(CountDownLatch start, String phone, String code) throws Exception {
        start.await();
        MvcResult result = verify(phone, code).andReturn();
        String body = result.getResponse().getContentAsString();
        if (result.getResponse().getStatus() != 400 || body.isEmpty()) {
            return "";
        }
        return JsonPath.read(body, "$.code");
    }

    private boolean consumeAfterLatch(CountDownLatch start, String token, String phone) throws Exception {
        start.await();
        try {
            consumeVerificationToken.consume(token, phone);
            return true;
        } catch (PhoneNotVerifiedException exception) {
            return false;
        }
    }

    private Integer bookAfterLatch(
            CountDownLatch start,
            String phone,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String token) throws Exception {
        start.await();
        return mockMvc.perform(post(PUBLIC_APPOINTMENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, procedure, date, time, token)))
                .andReturn()
                .getResponse()
                .getStatus();
    }
}
