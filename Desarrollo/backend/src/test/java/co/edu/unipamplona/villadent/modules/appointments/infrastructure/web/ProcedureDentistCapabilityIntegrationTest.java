package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import co.edu.unipamplona.villadent.support.CapturingVerificationSender;
import co.edu.unipamplona.villadent.support.PublicBookingTestSupport;
import co.edu.unipamplona.villadent.support.VerificationTestConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import({TestcontainersConfiguration.class, VerificationTestConfiguration.class})
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class ProcedureDentistCapabilityIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final String PASSWORD = "clave-segura";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ScheduleRepository schedules;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    private String tokenFor(Role role) throws Exception {
        String email = "user-" + UUID.randomUUID() + "@test.local";
        users.save(User.create("Usuario de prueba", email, passwordHasher.hash(PASSWORD), role));
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
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

    private void schedule(Dentist dentist, LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(8, 0), LocalTime.of(12, 0)));
        schedules.save(Schedule.create(dentist.id(), dayOfWeek, LocalTime.of(14, 0), LocalTime.of(18, 0)));
    }

    private long procedurePerformedBy(String token, Dentist dentist) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Limpieza %s","durationMinutes":30,"dentistIds":[%d]}
                                """.formatted(UUID.randomUUID(), dentist.id())))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private String availabilityUrl(Dentist dentist, LocalDate date, long procedureId) {
        return "/api/v1/public/availability?dentistId=%d&date=%s&procedureId=%d"
                .formatted(dentist.id(), date, procedureId);
    }

    @Autowired
    private CapturingVerificationSender verificationSender;

    private String uniquePhone() {
        return "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000);
    }

    private String bookingBody(
            String phone,
            Dentist dentist,
            long procedureId,
            LocalDate date,
            LocalTime time) {
        return """
                {"patientName":"Paciente Ficticio","patientPhone":"%s","dentistId":%d,
                 "procedureId":%d,"date":"%s","time":"%s"}
                """.formatted(phone, dentist.id(), procedureId, date, time);
    }

    private String publicBookingBody(
            Dentist dentist,
            long procedureId,
            LocalDate date,
            LocalTime time) throws Exception {
        String phone = uniquePhone();
        String verificationToken = PublicBookingTestSupport.obtainToken(mockMvc, verificationSender, phone);
        return """
                {"patientName":"Paciente Ficticio","patientPhone":"%s","dentistId":%d,
                 "procedureId":%d,"date":"%s","time":"%s","verificationToken":"%s"}
                """.formatted(phone, dentist.id(), procedureId, date, time, verificationToken);
    }

    @Test
    @DisplayName("CP-RF12-06: availability only offers slots of dentists who perform the procedure")
    void availabilityOnlyForCapableDentists() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        LocalDate date = nextWorkingDay();
        Dentist capable = dentist("Dra. Laura Villamizar");
        Dentist other = dentist("Dr. Andrés Peña");
        schedule(capable, date);
        schedule(other, date);
        long procedureId = procedurePerformedBy(token, capable);

        mockMvc.perform(get(availabilityUrl(other, date, procedureId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots").isEmpty());

        mockMvc.perform(get(availabilityUrl(capable, date, procedureId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots").isNotEmpty());
    }

    @Test
    @DisplayName("CP-RF12-07: booking with a dentist who does not perform the procedure is rejected")
    void rejectsBookingWithIncapableDentist() throws Exception {
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        LocalDate date = nextWorkingDay();
        Dentist capable = dentist("Dra. Camila Ortiz");
        Dentist other = dentist("Dr. Andrés Peña");
        schedule(capable, date);
        schedule(other, date);
        long procedureId = procedurePerformedBy(auxiliarToken, capable);

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(publicBookingBody(other, procedureId, date, LocalTime.of(9, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DENTIST_DOES_NOT_PERFORM_PROCEDURE"))
                .andExpect(jsonPath("$.detail").value("El odontólogo no realiza este procedimiento."));

        mockMvc.perform(post("/api/v1/appointments")
                        .header("Authorization", "Bearer " + auxiliarToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(uniquePhone(), other, procedureId, date, LocalTime.of(10, 0))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DENTIST_DOES_NOT_PERFORM_PROCEDURE"))
                .andExpect(jsonPath("$.detail").value("El odontólogo no realiza este procedimiento."));
    }

    @Test
    @DisplayName("CP-RF12-07: booking with a capable dentist still succeeds")
    void acceptsBookingWithCapableDentist() throws Exception {
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        LocalDate date = nextWorkingDay();
        Dentist capable = dentist("Dra. Laura Villamizar");
        schedule(capable, date);
        long procedureId = procedurePerformedBy(auxiliarToken, capable);

        mockMvc.perform(post("/api/v1/public/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(publicBookingBody(capable, procedureId, date, LocalTime.of(10, 0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.procedureId").value(procedureId))
                .andExpect(jsonPath("$.dentistId").value(capable.id().intValue()));
    }
}
