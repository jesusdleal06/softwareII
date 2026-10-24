package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
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

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class StaffAgendaIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    @Autowired
    private MockMvc mockMvc;

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

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@villadent.co";
    }

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private LocalDate nextWorkingDay() {
        LocalDate date = LocalDate.now(Clock.system(BOGOTA)).plusDays(1);
        while (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private String tokenFor(Role role) throws Exception {
        String email = uniqueEmail(role.name().toLowerCase());
        users.save(User.create("Usuario de prueba", email, passwordHasher.hash("clave-segura"), role));
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"clave-segura"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private User user(Role role) {
        return users.save(User.create("Usuario de prueba", uniqueEmail(role.name().toLowerCase()),
                passwordHasher.hash("clave-segura"), role));
    }

    private String login(User user) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"clave-segura"}
                                """.formatted(user.email())))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private Dentist dentist(String name, Long userId) {
        return dentists.save(Dentist.create(name, "Odontología general", userId));
    }

    private void clinicHours(Dentist dentist, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(14, 0), LocalTime.of(18, 0)));
    }

    private Procedure procedure(String name, int durationMinutes) {
        return procedures.save(Procedure.create(name + " " + UUID.randomUUID(), durationMinutes));
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

    private MvcResult bookManual(
            String token,
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String patientName,
            String phone) throws Exception {
        return mockMvc.perform(post("/api/v1/appointments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson(patientName, phone, dentist, procedure, date, time)))
                .andReturn();
    }

    private MvcResult bookPublic(
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            String patientName,
            String phone) throws Exception {
        return mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson(patientName, phone, dentist, procedure, date, time)))
                .andReturn();
    }

    @Test
    @DisplayName("CP-RF08-01: a manual appointment hides the slot from the public site")
    void manualAppointmentHidesTheSlot() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);

        bookManual(token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone())
                .getResponse();

        mockMvc.perform(get("/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                        .formatted(dentist.id(), date, cleaning.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", not(hasItem("09:00"))));
    }

    @Test
    @DisplayName("CP-RF08-01: a manual appointment is stored with MANUAL origin")
    void manualAppointmentIsStoredWithManualOrigin() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dr. Andrés Peña", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(post("/api/v1/appointments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Carlos Pérez", uniquePhone(), dentist, cleaning,
                                date, LocalTime.of(9, 0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origin").value("MANUAL"))
                .andExpect(jsonPath("$.patientName").value("Carlos Pérez"))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.startsWith("VD-")));
    }

    @Test
    @DisplayName("CP-RF08-02: only one of a simultaneous public and manual booking is saved")
    void savesOnlyOneSimultaneousPublicAndManualBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        String publicPhone = uniquePhone();
        String manualPhone = uniquePhone();

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> publicBooking = pool.submit(() -> {
                start.await();
                return bookPublic(dentist, cleaning, date, LocalTime.of(10, 0), "Ana María Rueda", publicPhone);
            });
            Future<MvcResult> manualBooking = pool.submit(() -> {
                start.await();
                return bookManual(token, dentist, cleaning, date, LocalTime.of(10, 0),
                        "Carlos Pérez", manualPhone);
            });
            start.countDown();

            List<Integer> statuses = List.of(
                    publicBooking.get().getResponse().getStatus(),
                    manualBooking.get().getResponse().getStatus());
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
            assertThat(appointments.findByDentistIdAndDate(dentist.id(), date).stream()
                    .filter(appointment -> appointment.time().equals(LocalTime.of(10, 0)))
                    .filter(Appointment::occupiesSlot))
                    .hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("CP-RF08-03: an active appointment blocks a new manual booking")
    void activeAppointmentBlocksManualBooking() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        String phone = uniquePhone();

        bookManual(token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", phone);

        mockMvc.perform(post("/api/v1/appointments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", phone, dentist, cleaning,
                                date, LocalTime.of(10, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ACTIVE_APPOINTMENT_EXISTS"))
                .andExpect(jsonPath("$.detail").value(
                        "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva."));
    }

    @Test
    @DisplayName("CP-RF08-03: a manual booking reports the staff conflict message")
    void manualBookingReportsTheStaffConflictMessage() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dr. Andrés Peña", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);

        bookManual(token, dentist, cleaning, date, LocalTime.of(10, 0), "Ana María Rueda", uniquePhone());

        mockMvc.perform(post("/api/v1/appointments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Carlos Pérez", uniquePhone(), dentist, cleaning,
                                date, LocalTime.of(10, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"))
                .andExpect(jsonPath("$.detail").value("Este horario acaba de ser ocupado, elige otro."));
    }

    @Test
    @DisplayName("CP-RF08-01: the agenda lists the appointments of the requested date")
    void agendaListsTheRequestedDate() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        bookManual(token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());

        mockMvc.perform(get("/api/v1/appointments?date=" + date)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.dentistId == %d)]".formatted(dentist.id())).isNotEmpty())
                .andExpect(jsonPath("$[?(@.dentistId == %d)].patientPhone".formatted(dentist.id())).isNotEmpty());
    }

    @Test
    @DisplayName("CP-RF08-01: a dentist only sees their own agenda")
    void dentistSeesOnlyTheirOwnAgenda() throws Exception {
        LocalDate date = nextWorkingDay();
        User dentistUser = user(Role.ODONTOLOGO);
        Dentist own = dentist("Dra. Laura Villamizar", dentistUser.id());
        Dentist other = dentist("Dr. Andrés Peña", null);
        clinicHours(own, date);
        clinicHours(other, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        bookManual(auxiliarToken, own, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());
        bookManual(auxiliarToken, other, cleaning, date, LocalTime.of(10, 0), "Carlos Pérez", uniquePhone());
        String token = login(dentistUser);

        mockMvc.perform(get("/api/v1/appointments?date=" + date)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.dentistId == %d)]".formatted(own.id())).isNotEmpty())
                .andExpect(jsonPath("$[?(@.dentistId == %d)]".formatted(other.id())).isEmpty());

        mockMvc.perform(get("/api/v1/appointments?date=%s&dentistId=%d".formatted(date, other.id()))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("staff status: the assistant confirms, attends and cannot change a terminal appointment")
    void assistantChangesStatusAndTerminalAppointmentsAreLocked() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        MvcResult created = bookManual(
                token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());
        Long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(patch("/api/v1/appointments/{id}/status", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CONFIRMADA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));

        mockMvc.perform(patch("/api/v1/appointments/{id}/status", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"ATENDIDA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ATENDIDA"));

        mockMvc.perform(patch("/api/v1/appointments/{id}/status", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CANCELADA"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("APPOINTMENT_NOT_MANAGEABLE"))
                .andExpect(jsonPath("$.detail").value("Esta cita ya no admite cambios."));
    }

    @Test
    @DisplayName("staff reschedule: the assistant moves an appointment and the old slot is freed")
    void assistantReschedulesAnAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Camila Ortiz", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        MvcResult created = bookManual(
                token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());
        Long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(patch("/api/v1/appointments/{id}/reschedule", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","time":"11:00"}
                                """.formatted(date)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REPROGRAMADA"))
                .andExpect(jsonPath("$.time").value("11:00"));

        mockMvc.perform(get("/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                        .formatted(dentist.id(), date, cleaning.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", hasItem("09:00")))
                .andExpect(jsonPath("$.slots", not(hasItem("11:00"))));
    }

    @Test
    @DisplayName("staff reschedule: an overlapping slot is rejected with the staff message")
    void rescheduleRejectsAnOverlappingSlot() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.AUXILIAR);
        MvcResult created = bookManual(
                token, dentist, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone());
        Long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
        bookManual(token, dentist, cleaning, date, LocalTime.of(10, 0), "Carlos Pérez", uniquePhone());

        mockMvc.perform(patch("/api/v1/appointments/{id}/reschedule", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","time":"10:00"}
                                """.formatted(date)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"))
                .andExpect(jsonPath("$.detail").value("Este horario acaba de ser ocupado, elige otro."));
    }

    @Test
    @DisplayName("staff status: a dentist changes only their own appointments")
    void dentistChangesOnlyTheirOwnStatus() throws Exception {
        LocalDate date = nextWorkingDay();
        User dentistUser = user(Role.ODONTOLOGO);
        Dentist own = dentist("Dra. Laura Villamizar", dentistUser.id());
        Dentist other = dentist("Dr. Andrés Peña", null);
        clinicHours(own, date);
        clinicHours(other, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        Long ownId = ((Number) JsonPath.read(bookManual(
                        auxiliarToken, own, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone())
                .getResponse().getContentAsString(), "$.id")).longValue();
        Long otherId = ((Number) JsonPath.read(bookManual(
                        auxiliarToken, other, cleaning, date, LocalTime.of(10, 0), "Carlos Pérez", uniquePhone())
                .getResponse().getContentAsString(), "$.id")).longValue();
        String token = login(dentistUser);

        mockMvc.perform(patch("/api/v1/appointments/{id}/status", ownId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CONFIRMADA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));

        mockMvc.perform(patch("/api/v1/appointments/{id}/status", otherId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CONFIRMADA"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("staff reschedule: a dentist reschedules only their own appointments")
    void dentistReschedulesOnlyTheirOwnAppointments() throws Exception {
        LocalDate date = nextWorkingDay();
        User dentistUser = user(Role.ODONTOLOGO);
        Dentist own = dentist("Dra. Laura Villamizar", dentistUser.id());
        Dentist other = dentist("Dr. Andrés Peña", null);
        clinicHours(own, date);
        clinicHours(other, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        Long ownId = ((Number) JsonPath.read(bookManual(
                        auxiliarToken, own, cleaning, date, LocalTime.of(9, 0), "Ana María Rueda", uniquePhone())
                .getResponse().getContentAsString(), "$.id")).longValue();
        Long otherId = ((Number) JsonPath.read(bookManual(
                        auxiliarToken, other, cleaning, date, LocalTime.of(10, 0), "Carlos Pérez", uniquePhone())
                .getResponse().getContentAsString(), "$.id")).longValue();
        String token = login(dentistUser);

        mockMvc.perform(patch("/api/v1/appointments/{id}/reschedule", ownId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","time":"11:00"}
                                """.formatted(date)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.time").value("11:00"));

        mockMvc.perform(patch("/api/v1/appointments/{id}/reschedule", otherId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","time":"15:00"}
                                """.formatted(date)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                        .formatted(other.id(), date, cleaning.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots", not(hasItem("10:00"))))
                .andExpect(jsonPath("$.slots", hasItem("15:00")));
    }

    @Test
    @DisplayName("staff status: an anonymous request is rejected")
    void anonymousStatusChangeIsRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/appointments/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"CONFIRMADA"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CP-RF09-02: a dentist cannot create a manual appointment")
    void dentistCannotCreateManualAppointment() throws Exception {
        LocalDate date = nextWorkingDay();
        Dentist dentist = dentist("Dra. Laura Villamizar", null);
        clinicHours(dentist, date);
        Procedure cleaning = procedure("Limpieza", 30);
        String token = tokenFor(Role.ODONTOLOGO);

        mockMvc.perform(post("/api/v1/appointments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Ana María Rueda", uniquePhone(), dentist, cleaning,
                                date, LocalTime.of(9, 0))))
                .andExpect(status().isForbidden());
    }
}
