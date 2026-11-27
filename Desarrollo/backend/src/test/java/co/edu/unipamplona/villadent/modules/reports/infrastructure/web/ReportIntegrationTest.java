package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
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
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportStorage;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import({TestcontainersConfiguration.class, ReportIntegrationTest.StorageConfig.class})
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class ReportIntegrationTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    private static final String SIGNED_DOWNLOAD_URL =
            "https://api.cloudinary.com/v1_1/test-cloud/raw/download?public_id=report.pdf&signature=fake-signature";

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

    @Autowired
    private FakeReportStorage storage;

    @Autowired
    private JdbcTemplate jdbc;

    @TestConfiguration
    static class StorageConfig {
        @Bean
        @Primary
        FakeReportStorage fakeReportStorage() {
            return new FakeReportStorage();
        }
    }

    static class FakeReportStorage implements ReportStorage {
        private final Map<String, byte[]> files = new ConcurrentHashMap<>();
        private final Map<String, RuntimeException> downloadFailures = new ConcurrentHashMap<>();
        private final AtomicBoolean failNextUpload = new AtomicBoolean();

        @Override
        public String upload(byte[] pdf) {
            if (failNextUpload.getAndSet(false)) {
                throw new IllegalStateException("Simulated upload failure");
            }
            String publicId = UUID.randomUUID().toString();
            files.put(publicId, pdf.clone());
            return publicId;
        }

        @Override
        public void download(String publicId, OutputStream target) {
            var failure = downloadFailures.remove(publicId);
            if (failure != null) {
                throw failure;
            }
            try {
                target.write(files.get(publicId));
            } catch (IOException exception) {
                throw new UncheckedIOException(exception);
            }
        }
    }

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
    @Test
    @DisplayName("CP-RF10-05: PDF has the CSV totals and clinic name within five seconds")
    void exportsMonthAsPdf() throws Exception {
        var from = LocalDate.of(2025, 4, 1);
        var to = from.plusMonths(1).minusDays(1);
        createMonthExample(dentist("Laura Peña"), procedure(), from);
        var token = tokenFor(Role.AUXILIAR);
        String url = "/api/v1/reports/export?" + range(from, to);
        String csv = mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(csv).contains("Total de citas,6", "Pacientes atendidos,2",
                "Citas canceladas,1", "Inasistencias,1", "Índice de inasistencia,33%");
        byte[] reportPdf = pdf(from, to, null, token);
        assertPdfSummary(reportPdf, List.of("6", "2", "1", "1", "33%"));
        assertThat(pdfText(reportPdf)).contains(
                "Centro Odontológico Villadent", from.toString(), to.toString(), "Todos",
                "Generado:",
                "Fecha Total Pendiente Confirmada Reprogramada Cancelada Atendida No asistió",
                "2025-04-01 6 1 1 0 1 2 1", "Página 1 de")
                .doesNotContain("Paciente de prueba");
    }

    @Test
    @DisplayName("CP-RF10-06: PDF includes only the selected dentist and shows their name")
    void exportsFilteredPdf() throws Exception {
        var date = LocalDate.of(2025, 5, 1);
        var selected = dentist("Laura Peña");
        var other = dentist("Camilo Ortiz");
        var procedure = procedure();
        appointment(selected, procedure, date, LocalTime.of(8, 0), AppointmentStatus.ATENDIDA);
        appointment(other, procedure, date, LocalTime.of(8, 0), AppointmentStatus.CANCELADA);
        byte[] reportPdf = pdf(date, date, selected.id(), tokenFor(Role.AUXILIAR));
        assertPdfSummary(reportPdf, List.of("1", "1", "0", "0", "0%"));
        assertThat(pdfText(reportPdf))
                .contains("Laura Peña")
                .doesNotContain("Camilo Ortiz");
    }

    @Test
    @DisplayName("CP-RF10-07: empty PDF contains the no-data message")
    void exportsEmptyPdf() throws Exception {
        var date = LocalDate.of(2025, 6, 1);
        assertThat(pdfText(pdf(date, date, null, tokenFor(Role.AUXILIAR))))
                .contains("No hay datos para el periodo seleccionado", date.toString(), "Todos");
    }

    @Test
    @DisplayName("CP-RF10-09: each successful PDF appears newest first with metadata")
    void recordsSuccessfulExports() throws Exception {
        var date = LocalDate.of(2025, 7, 1);
        var selected = dentist("Laura Peña");
        var token = tokenFor(Role.AUXILIAR);
        int before = storage.files.size();
        pdf(date, date, null, token);
        pdf(date.plusDays(1), date.plusDays(2), selected.id(), token);
        assertThat(storage.files).hasSize(before + 2);
        jdbc.update("""
                INSERT INTO reportes_generados (desde, hasta, id_usuario, generado_en, cloudinary_public_id)
                SELECT DATE '2024-01-01', DATE '2024-01-01', recent.id_usuario,
                       TIMESTAMPTZ '2024-01-01 00:00:00+00', 'older-test-report-' || fixture.n
                FROM (SELECT id_usuario FROM reportes_generados WHERE desde = ?) recent
                CROSS JOIN generate_series(1, 51) fixture(n)
                """, date);
        mockMvc.perform(get("/api/v1/reports/history").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(50))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].from").value(date.plusDays(1).toString()))
                .andExpect(jsonPath("$[0].to").value(date.plusDays(2).toString()))
                .andExpect(jsonPath("$[0].dentistId").value(selected.id()))
                .andExpect(jsonPath("$[0].dentistName").value("Laura Peña"))
                .andExpect(jsonPath("$[0].generatedBy").value("Usuario de prueba"))
                .andExpect(jsonPath("$[0].cloudinaryPublicId").doesNotExist())
                .andExpect(jsonPath("$[1].from").value(date.toString()))
                .andExpect(jsonPath("$[1].dentistName").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(result -> java.time.Instant.parse(
                        JsonPath.read(result.getResponse().getContentAsString(), "$[0].generatedAt")));
    }

    @Test
    @DisplayName("CP-RF10-10: an upload failure still delivers the PDF without recording history")
    void deliversPdfWhenUploadFails() throws Exception {
        var date = LocalDate.of(2025, 8, 1);
        var token = tokenFor(Role.AUXILIAR);
        storage.failNextUpload.set(true);
        try {
            assertThat(pdf(date, date, null, token)).isNotEmpty();
        } finally {
            storage.failNextUpload.set(false);
        }
        mockMvc.perform(get("/api/v1/reports/history").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.from == '2025-08-01')]").isEmpty());
    }

    @Test
    @DisplayName("CP-RF10-11: an auxiliary user can re-download the PDF but other callers cannot")
    void downloadsPrivatePdf() throws Exception {
        var date = LocalDate.of(2025, 9, 1);
        var token = tokenFor(Role.AUXILIAR);
        byte[] expected = pdf(date, date, null, token);
        var history = mockMvc.perform(get("/api/v1/reports/history")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        Number id = JsonPath.read(history.getResponse().getContentAsString(), "$[0].id");
        String url = "/api/v1/reports/history/" + id + "/pdf";
        var download = mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.request().asyncStarted())
                .andReturn();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch(download))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"reporte-%s-%s.pdf\"".formatted(date, date)))
                .andExpect(content().bytes(expected));
        mockMvc.perform(get("/api/v1/reports/history/{id}/pdf", Long.MAX_VALUE)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(url)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/reports/history")).andExpect(status().isUnauthorized());
        String dentistToken = tokenFor(Role.ODONTOLOGO);
        mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/reports/history").header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CP-RF10-11: a Cloudinary download failure answers 502 problem+json without leaking the signed URL")
    void doesNotLeakSignedUrlWhenDownloadFails() throws Exception {
        var date = LocalDate.of(2025, 9, 2);
        var token = tokenFor(Role.AUXILIAR);
        pdf(date, date, null, token);
        var report = jdbc.queryForMap(
                "SELECT id, cloudinary_public_id FROM reportes_generados WHERE desde = ? AND hasta = ?", date, date);
        storage.downloadFailures.put((String) report.get("cloudinary_public_id"),
                new IllegalStateException("Simulated download failure: " + SIGNED_DOWNLOAD_URL));

        var download = mockMvc.perform(get("/api/v1/reports/history/{id}/pdf", report.get("id"))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(request().asyncStarted())
                .andReturn();
        mockMvc.perform(asyncDispatch(download))
                .andExpect(status().isBadGateway())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("No se pudo descargar el reporte."))
                .andExpect(header().doesNotExist(HttpHeaders.CONTENT_DISPOSITION))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString())
                        .doesNotContain(SIGNED_DOWNLOAD_URL, "signature"));
    }

    @Test
    void keepsDefaultCsvAndRejectsUnknownFormat() throws Exception {
        var day = LocalDate.of(2025, 10, 1);
        var token = tokenFor(Role.AUXILIAR);
        String url = "/api/v1/reports/export?" + range(day, day);
        String authorization = "Bearer " + token;
        var baseline = mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isOk()).andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"reporte-2025-10-01-2025-10-01.csv\""))
                .andExpect(content().string("""
                        Reporte de citas
                        Desde,2025-10-01
                        Hasta,2025-10-01
                        Odontólogo,Todos
                        Total de citas,0
                        Pacientes atendidos,0
                        Citas canceladas,0
                        Inasistencias,0
                        Índice de inasistencia,0%
                        Fecha,Total,Pendiente,Confirmada,Reprogramada,Cancelada,Atendida,No asistió
                        2025-10-01,0,0,0,0,0,0,0
                        """)).andReturn();
        mockMvc.perform(get(url + "&format=csv").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isOk()).andExpect(content().bytes(baseline.getResponse().getContentAsByteArray()));
        mockMvc.perform(get(url + "&format=xls").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isBadRequest());
    }

    private byte[] pdf(LocalDate from, LocalDate to, Long dentistId, String token) throws Exception {
        String url = "/api/v1/reports/export?" + range(from, to) + "&format=pdf"
                + (dentistId == null ? "" : "&dentistId=" + dentistId);
        long start = System.nanoTime();
        var response = mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"reporte-%s-%s.pdf\"".formatted(from, to)))
                .andReturn().getResponse();
        assertThat((System.nanoTime() - start) / 1_000_000).isLessThan(5000);
        return response.getContentAsByteArray();
    }

    private static void assertPdfSummary(byte[] bytes, List<String> values) throws Exception {
        try (var document = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            var lines = new org.apache.pdfbox.text.PDFTextStripper().getText(document).lines()
                    .map(String::strip).toList();
            assertThat(lines).containsSubsequence(
                    values.get(0), "Total de citas",
                    values.get(1), "Pacientes atendidos",
                    values.get(2), "Citas canceladas",
                    values.get(3), "Inasistencias",
                    values.get(4), "Índice de inasistencia");
        }
    }

    private static String pdfText(byte[] bytes) throws Exception {
        try (var document = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            return new org.apache.pdfbox.text.PDFTextStripper().getText(document).replaceAll("\\s+", " ");
        }
    }
}
