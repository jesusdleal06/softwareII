package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class CatalogIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

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
    @DisplayName("The auxiliar manages dentists and their weekly schedules")
    void managesDentistsAndSchedules() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        MvcResult created = mockMvc.perform(post("/api/v1/dentists")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Dra. Laura Villamizar","specialty":"Odontología general"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Dra. Laura Villamizar"))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn();
        Number dentistId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/dentists/{id}/schedules", dentistId.longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dayOfWeek":1,"start":"08:00","end":"12:00"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dayOfWeek").value(1));

        mockMvc.perform(get("/api/v1/dentists/{id}/schedules", dentistId.longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(Role.ODONTOLOGO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("The auxiliar manages procedures and dentists can only read them")
    void managesProcedures() throws Exception {
        String auxiliarToken = tokenFor(Role.AUXILIAR);
        String name = "Limpieza " + UUID.randomUUID();

        mockMvc.perform(post("/api/v1/procedures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auxiliarToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.durationMinutes").value(30));

        mockMvc.perform(post("/api/v1/procedures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auxiliarToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30}
                                """.formatted(name)))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/v1/procedures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auxiliarToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Otro procedimiento","durationMinutes":20}
                                """))
                .andExpect(status().isBadRequest());

        String dentistToken = tokenFor(Role.ODONTOLOGO);
        mockMvc.perform(get("/api/v1/procedures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/procedures")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + dentistToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"No permitido","durationMinutes":30}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void deactivatingADentistKeepsTheRecord() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        MvcResult created = mockMvc.perform(post("/api/v1/dentists")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Dr. Andrés Peña","specialty":"Ortodoncia"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/v1/dentists/{id}/desactivar", id.longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/v1/dentists")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").isNotEmpty());
    }
}
