package co.edu.unipamplona.villadent.modules.patients.infrastructure.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
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
class PatientIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    private String uniquePhone() {
        return "3" + String.format("%09d", Math.floorMod(System.nanoTime(), 1_000_000_000L));
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@villadent.co";
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

    @Test
    @DisplayName("CP-RF02-01: a valid patient is stored and listed")
    void validPatientIsStored() throws Exception {
        String phone = uniquePhone();

        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(Role.AUXILIAR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María Rueda","phone":"%s"}
                                """.formatted(phone)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullName").value("Ana María Rueda"))
                .andExpect(jsonPath("$.phone").value(phone))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("CP-RF02-02: an empty name is rejected with the prototype message")
    void emptyNameIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(Role.AUXILIAR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"","phone":"%s"}
                                """.formatted(uniquePhone())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Patient.NAME_REQUIRED));
    }

    @Test
    @DisplayName("CP-RF02-03: a malformed phone is rejected with the prototype message")
    void malformedPhoneIsRejected() throws Exception {
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María","phone":"300123456"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Patient.PHONE_LENGTH));

        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María","phone":"2001234567"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Patient.PHONE_PREFIX));
    }

    @Test
    @DisplayName("An inactive phone is reactivated instead of duplicated")
    void inactivePhoneIsReactivated() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        String phone = uniquePhone();
        MvcResult created = mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María","phone":"%s"}
                                """.formatted(phone)))
                .andExpect(status().isCreated())
                .andReturn();
        Number idValue = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        Long id = idValue.longValue();

        mockMvc.perform(patch("/api/v1/patients/{id}/desactivar", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María Rueda","phone":"%s"}
                                """.formatted(phone)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.fullName").value("Ana María Rueda"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void dentistCanReadButNotCreatePatients() throws Exception {
        String token = tokenFor(Role.ODONTOLOGO);

        mockMvc.perform(get("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/patients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Ana María","phone":"%s"}
                                """.formatted(uniquePhone())))
                .andExpect(status().isForbidden());
    }
}
