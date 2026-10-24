package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivens.ProcedureRepository;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class ReportIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DentistRepository dentists;

    @Autowired
    private ProcedureRepository procedures;

    @Autowired
    private PatientRepository patients;

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

    private Dentist dentist(String name) {
        return dentists.save(Dentist.create(name, "Odontología general", null));
    }

    private Procedure procedure() {
        return procedures.save(Procedure.create("Limpieza " + UUID.randomUUID(), 30));
    }

    private Appointment appointment(
            Dentist dentist,
            Procedure procedure,
            LocalDate date,
            LocalTime time,
            AppointmentStatus status) {
        Patient patient = patients.save(Patient.create("Paciente de prueba", uniquePhone()));
        return appointments.save(new Appointment(
                null,
                appointments.nextCode(),
                patient.id(),
                dentist.id(),
                procedure.id(),
                date,
                time,
                30,
                status,
                AppointmentOrigin.MANUAL,
                null));
    }

    private void createMonthExample(Dentist dentist, Procedure procedure, LocalDate date) {
        appointment(dentist, procedure, date, LocalTime.of(8, 0), AppointmentStatus.ATENDIDA);
        appointment(dentist, procedure, date, LocalTime.of(8, 30), AppointmentStatus.ATENDIDA);
        appointment(dentist, procedure, date, LocalTime.of(9, 0), AppointmentStatus.CANCELADA);
        appointment(dentist, procedure, date, LocalTime.of(9, 30), AppointmentStatus.NO_ASISTIO);
        appointment(dentist, procedure, date, LocalTime.of(10, 0), AppointmentStatus.PENDIENTE);
        appointment(dentist, procedure, date, LocalTime.of(10, 30), AppointmentStatus.CONFIRMADA);
    }

    private static String range(LocalDate from, LocalDate to) {
        return "from=%s&to=%s".formatted(from, to);
    }

    @Test
    @DisplayName("CP-RF10-01: the current-month report has the correct totals in under five seconds")
    void reportsTheCurrentMonthWithinFiveSeconds() throws Exception {
        LocalDate from = YearMonth.now(Clock.system(BOGOTA)).atDay(1);
        LocalDate to = YearMonth.now(Clock.system(BOGOTA)).atEndOfMonth();
        LocalDate day = from;
        Dentist dentist = dentist("Dra. Laura Villamizar");
        createMonthExample(dentist, procedure(), day);
        String token = tokenFor(Role.AUXILIAR);

        long start = System.nanoTime();
        mockMvc.perform(get("/api/v1/reports?" + range(from, to) + "&dentistId=" + dentist.id())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value(from.toString()))
                .andExpect(jsonPath("$.to").value(to.toString()))
                .andExpect(jsonPath("$.total").value(6))
                .andExpect(jsonPath("$.attended").value(2))
                .andExpect(jsonPath("$.cancelled").value(1))
                .andExpect(jsonPath("$.noShow").value(1))
                .andExpect(jsonPath("$.noShowRate").value(33))
                .andExpect(jsonPath("$.daily[0].date").value(day.toString()))
                .andExpect(jsonPath("$.daily[0].total").value(6))
                .andExpect(jsonPath("$.daily[0].counts.attended").value(2))
                .andExpect(jsonPath("$.daily[0].counts.noShow").value(1));
        long elapsedMillis = (System.nanoTime() - start) / 1_000_000;

        assertThat(elapsedMillis).isLessThan(5_000);

        long exportStart = System.nanoTime();
        mockMvc.perform(get("/api/v1/reports/export?" + range(from, to) + "&dentistId=" + dentist.id())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        containsString("attachment; filename=\"reporte-%s-%s.csv\"".formatted(from, to))))
                .andExpect(content().string(containsString("Total de citas,6")))
                .andExpect(content().string(containsString("Pacientes atendidos,2")))
                .andExpect(content().string(containsString("Citas canceladas,1")))
                .andExpect(content().string(containsString("Inasistencias,1")));
        long exportElapsedMillis = (System.nanoTime() - exportStart) / 1_000_000;

        assertThat(exportElapsedMillis).isLessThan(5_000);
    }

    @Test
    @DisplayName("CP-RF10-02: filtering by dentist only includes that dentist's appointments")
    void filtersByDentist() throws Exception {
        LocalDate date = YearMonth.now(Clock.system(BOGOTA)).atDay(1);
        Dentist chosen = dentist("Dra. Laura Villamizar");
        Dentist other = dentist("Dr. Andrés Peña");
        Procedure procedure = procedure();
        appointment(chosen, procedure, date, LocalTime.of(8, 0), AppointmentStatus.ATENDIDA);
        appointment(other, procedure, date, LocalTime.of(9, 0), AppointmentStatus.CANCELADA);
        appointment(other, procedure, date, LocalTime.of(9, 30), AppointmentStatus.CANCELADA);
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(get("/api/v1/reports?" + range(date, date) + "&dentistId=" + chosen.id())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dentistId").value(chosen.id()))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.attended").value(1))
                .andExpect(jsonPath("$.cancelled").value(0));
    }

    @Test
    @DisplayName("CP-RF10-03: a period without appointments returns zero totals")
    void emptyPeriodReturnsZeroTotals() throws Exception {
        LocalDate date = YearMonth.now(Clock.system(BOGOTA)).atDay(2);
        Dentist dentist = dentist("Dra. Camila Ortiz");
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(get("/api/v1/reports?" + range(date, date.plusDays(1)) + "&dentistId=" + dentist.id())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.attended").value(0))
                .andExpect(jsonPath("$.cancelled").value(0))
                .andExpect(jsonPath("$.noShow").value(0))
                .andExpect(jsonPath("$.noShowRate").value(0))
                .andExpect(jsonPath("$.daily[0].total").value(0))
                .andExpect(jsonPath("$.daily[1].total").value(0));
    }

    @Test
    @DisplayName("CP-RF10-04: an invalid range answers 400 with the Spanish message")
    void invalidRangeAnswersBadRequest() throws Exception {
        LocalDate from = LocalDate.of(2026, 10, 31);
        LocalDate to = LocalDate.of(2026, 10, 1);
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(get("/api/v1/reports?" + range(from, to))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"))
                .andExpect(jsonPath("$.detail").value(
                        "La fecha final debe ser igual o posterior a la inicial."));
    }

    @Test
    @DisplayName("CP-RF09-03: the report is available only to the administrative role")
    void reportsAreRestrictedToTheAdministrativeRole() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 1);
        String dentistToken = tokenFor(Role.ODONTOLOGO);

        mockMvc.perform(get("/api/v1/reports?" + range(date, date))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken))
                .andExpect(status().isForbidden());
    }
}
