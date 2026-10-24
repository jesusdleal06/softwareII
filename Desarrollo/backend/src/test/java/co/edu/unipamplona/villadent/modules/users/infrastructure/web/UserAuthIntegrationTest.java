package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
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
class UserAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@villadent.co";
    }

    private User createUser(String email, String rawPassword, Role role) {
        return users.save(User.create("Usuario de prueba", email, passwordHasher.hash(rawPassword), role));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    @Test
    @DisplayName("CP-RF09-01: login returns the role and each role reaches its own surface")
    void loginReturnsTheRole() throws Exception {
        String auxiliarEmail = uniqueEmail("auxiliar");
        String dentistEmail = uniqueEmail("odontologo");
        createUser(auxiliarEmail, "clave-segura", Role.AUXILIAR);
        createUser(dentistEmail, "clave-segura", Role.ODONTOLOGO);

        MvcResult auxiliarLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"clave-segura"}
                                """.formatted(auxiliarEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInSeconds").value(28800))
                .andExpect(jsonPath("$.user.role").value("AUXILIAR"))
                .andReturn();
        String auxiliarToken = JsonPath.read(auxiliarLogin.getResponse().getContentAsString(), "$.token");
        String dentistToken = login(dentistEmail, "clave-segura");

        mockMvc.perform(get("/api/v1/reports/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auxiliarToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/reports/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("CP-RF09-02: a wrong password answers 401 without a session")
    void wrongPasswordAnswersUnauthorized() throws Exception {
        String email = uniqueEmail("wrong-password");
        createUser(email, "clave-segura", Role.AUXILIAR);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"otra-clave"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.detail").value(
                        "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo."));
    }

    @Test
    @DisplayName("CP-RF09-04: a protected path without a token answers 401")
    void protectedPathAnswersUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("CP-RNF03-01: the stored password is a BCrypt hash, not the raw value")
    void passwordIsStoredAsBCrypt() {
        String email = uniqueEmail("bcrypt");
        createUser(email, "clave-segura", Role.AUXILIAR);

        User saved = users.findByEmail(email).orElseThrow();

        assertThat(saved.passwordHash()).startsWith("$2");
        assertThat(saved.passwordHash()).isNotEqualTo("clave-segura");
        assertThat(passwordHasher.matches("clave-segura", saved.passwordHash())).isTrue();
    }

    @Test
    void deactivatedUserCannotSignIn() throws Exception {
        String email = uniqueEmail("inactive");
        User user = createUser(email, "clave-segura", Role.AUXILIAR);
        users.save(user.changeActive(false));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"clave-segura"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void loginCorsAllowsTheFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"));
    }

    @Test
    void userCreationRequiresTheAuxiliarRole() throws Exception {
        String auxiliarEmail = uniqueEmail("creator");
        String dentistEmail = uniqueEmail("reader");
        createUser(auxiliarEmail, "clave-segura", Role.AUXILIAR);
        createUser(dentistEmail, "clave-segura", Role.ODONTOLOGO);

        String newEmail = uniqueEmail("new-user");
        mockMvc.perform(post("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login(dentistEmail, "clave-segura"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Nueva Persona","email":"%s","password":"clave-segura","role":"AUXILIAR"}
                                """.formatted(newEmail)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login(auxiliarEmail, "clave-segura"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Nueva Persona","email":"%s","password":"clave-segura","role":"AUXILIAR"}
                                """.formatted(newEmail)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(newEmail));
    }
}
