package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
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
import java.time.ZoneId;
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
class StaffIntegrationTest {

    private static final String PASSWORD = "clave-segura";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    @Autowired
    private PatientRepository patients;

    @Autowired
    private ProcedureRepository procedures;

    @Autowired
    private AppointmentRepository appointments;

    private record StaffSession(String token, Long userId) {}

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@villadent.co";
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private StaffSession createSession(Role role, String name) throws Exception {
        String email = uniqueEmail(role.name().toLowerCase());
        User user = users.save(User.create(name, email, passwordHasher.hash(PASSWORD), role));
        return new StaffSession(login(email), user.id());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private MvcResult createStaff(String token, String body) throws Exception {
        return mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    @Test
    @DisplayName("CP-RF13-01: an auxiliar adds an odontólogo who can sign in and appears in the public team")
    void auxiliarAddsAnOdontologo() throws Exception {
        String auxiliarToken = createSession(Role.AUXILIAR, "Auxiliar de prueba").token();
        String email = uniqueEmail("odontologo");
        String name = "Laura Méndez " + UUID.randomUUID();

        mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(auxiliarToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","email":"%s","password":"%s","role":"ODONTOLOGO","specialty":"Ortodoncia"}
                                """.formatted(name, email, PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ODONTOLOGO"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.specialty").value("Ortodoncia"))
                .andExpect(jsonPath("$.dentistId").isNumber());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());

        mockMvc.perform(get("/api/v1/public/dentists"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == '%s')]".formatted(name)).isNotEmpty());
    }

    @Test
    @DisplayName("CP-RF13-02: an auxiliar adds a staff member without creating a dentist record")
    void auxiliarAddsAnAuxiliarWithoutDentistRecord() throws Exception {
        String token = createSession(Role.AUXILIAR, "Auxiliar de prueba").token();

        mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sara Administrativa","email":"%s","password":"%s","role":"AUXILIAR"}
                                """.formatted(uniqueEmail("auxiliar"), PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("AUXILIAR"))
                .andExpect(jsonPath("$.dentistId").doesNotExist())
                .andExpect(jsonPath("$.specialty").doesNotExist());

        mockMvc.perform(get("/api/v1/dentists")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Sara Administrativa')]").isEmpty());
    }

    @Test
    @DisplayName("CP-RF13-03: adding a staff member with an existing email answers 409")
    void rejectsDuplicatedEmail() throws Exception {
        String token = createSession(Role.AUXILIAR, "Auxiliar de prueba").token();
        String email = uniqueEmail("duplicado");
        String body = """
                {"name":"Sara Administrativa","email":"%s","password":"%s","role":"AUXILIAR"}
                """.formatted(email, PASSWORD);

        mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.detail").value("Ya existe un usuario con ese correo."));
    }

    @Test
    @DisplayName("CP-RF13-04: editing a staff member updates the user and its dentist record")
    void editsStaffAndDentist() throws Exception {
        StaffSession session = createSession(Role.AUXILIAR, "Auxiliar de prueba");
        MvcResult created = createStaff(session.token(), """
                {"name":"Dra. Laura Méndez","email":"%s","password":"%s","role":"ODONTOLOGO","specialty":"Ortodoncia"}
                """.formatted(uniqueEmail("odontologo"), PASSWORD));
        Number userId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String newEmail = uniqueEmail("actualizado");

        mockMvc.perform(put("/api/v1/staff/{id}", userId.longValue())
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Laura Méndez Ruiz","email":"%s","specialty":"Endodoncia"}
                                """.formatted(newEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Laura Méndez Ruiz"))
                .andExpect(jsonPath("$.email").value(newEmail))
                .andExpect(jsonPath("$.specialty").value("Endodoncia"));

        mockMvc.perform(get("/api/v1/dentists")
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)].name".formatted(userId.longValue()))
                        .value(hasItem("Laura Méndez Ruiz")))
                .andExpect(jsonPath("$[?(@.userId == %d)].specialty".formatted(userId.longValue()))
                        .value(hasItem("Endodoncia")));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(newEmail, PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("CP-RF13-05: deactivating staff blocks sign in and hides the dentist from public lists")
    void deactivationBlocksSignInAndHidesDentist() throws Exception {
        StaffSession session = createSession(Role.AUXILIAR, "Auxiliar de prueba");
        String dentistEmail = uniqueEmail("odontologo");
        String dentistName = "Andrés Peña " + UUID.randomUUID();
        MvcResult created = createStaff(session.token(), """
                {"name":"%s","email":"%s","password":"%s","role":"ODONTOLOGO","specialty":"Ortodoncia"}
                """.formatted(dentistName, dentistEmail, PASSWORD));
        Number userId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/v1/staff/{id}/desactivar", userId.longValue())
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(dentistEmail, PASSWORD)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/public/dentists"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == '%s')]".formatted(dentistName)).isEmpty());
    }

    @Test
    @DisplayName("CP-RF13-06: deactivating a dentist with future appointments answers 409")
    void rejectsDeactivatingADentistWithFutureAppointments() throws Exception {
        StaffSession session = createSession(Role.AUXILIAR, "Auxiliar de prueba");
        MvcResult created = createStaff(session.token(), """
                {"name":"Dra. Camila Ortiz","email":"%s","password":"%s","role":"ODONTOLOGO","specialty":"Cirugía oral"}
                """.formatted(uniqueEmail("odontologo"), PASSWORD));
        Number userId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        Number dentistId = JsonPath.read(created.getResponse().getContentAsString(), "$.dentistId");

        Patient patient = patients.save(Patient.create(
                "Paciente Ficticio",
                "3" + ThreadLocalRandom.current().nextInt(100_000_000, 1_000_000_000)));
        Procedure procedure = procedures.save(Procedure.create("Exodoncia " + UUID.randomUUID(), 60));
        LocalDate date = LocalDate.now(Clock.system(ZoneId.of("America/Bogota"))).plusDays(2);
        appointments.save(new Appointment(
                null,
                "VD-" + ThreadLocalRandom.current().nextInt(1_000_000_000),
                patient.id(),
                dentistId.longValue(),
                procedure.id(),
                date,
                LocalTime.of(10, 0),
                60,
                AppointmentStatus.PENDIENTE,
                AppointmentOrigin.MANUAL,
                UUID.randomUUID().toString().replace("-", "")));

        mockMvc.perform(patch("/api/v1/staff/{id}/desactivar", userId.longValue())
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.token())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DENTIST_HAS_FUTURE_APPOINTMENTS"))
                .andExpect(jsonPath("$.detail").value(containsString("citas futuras")));
    }

    @Test
    @DisplayName("CP-RF09-04: a staff write without a token answers HTTP 401")
    void staffWriteWithoutTokenAnswersUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sara Administrativa","email":"%s","password":"%s","role":"AUXILIAR"}
                                """.formatted(uniqueEmail("sin-token"), PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("CP-RF13-07: an auxiliar cannot deactivate their own account")
    void anAuxiliarCannotDeactivateOwnAccount() throws Exception {
        StaffSession session = createSession(Role.AUXILIAR, "Auxiliar de prueba");

        mockMvc.perform(patch("/api/v1/staff/{id}/desactivar", session.userId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(session.token())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CANNOT_DEACTIVATE_OWN_ACCOUNT"))
                .andExpect(jsonPath("$.detail").value("No puede desactivar su propia cuenta."));
    }

    @Test
    @DisplayName("CP-RF13-08: an odontólogo session cannot reach the staff endpoints")
    void anOdontologoCannotManageStaff() throws Exception {
        String odontologoToken = createSession(Role.ODONTOLOGO, "Dra. Marcela Ríos").token();

        mockMvc.perform(get("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(odontologoToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(odontologoToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sara Administrativa","email":"%s","password":"%s","role":"AUXILIAR"}
                                """.formatted(uniqueEmail("auxiliar"), PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
