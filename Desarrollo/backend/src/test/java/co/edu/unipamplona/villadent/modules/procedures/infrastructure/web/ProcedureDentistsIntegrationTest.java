package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.unipamplona.villadent.TestcontainersConfiguration;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class ProcedureDentistsIntegrationTest {

    private static final String PASSWORD = "clave-segura";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DentistRepository dentists;

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

    private Dentist activeDentist(String name) {
        return dentists.save(Dentist.create(name, "Odontología general", null));
    }

    private Dentist inactiveDentist(String name) {
        return dentists.save(Dentist.create(name, "Odontología general", null).changeActive(false));
    }

    private String uniqueName(String base) {
        return base + " " + UUID.randomUUID();
    }

    private MvcResult createProcedure(String token, String name, int durationMinutes, List<Long> dentistIds)
            throws Exception {
        String body = """
                {"name":"%s","durationMinutes":%d,"dentistIds":%s}
                """.formatted(name, durationMinutes, dentistIds);
        return mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    @Test
    @DisplayName("CP-RF12-01: the auxiliar creates a 60 minute procedure performed by an active dentist")
    void createsProcedureWithDentist() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        Dentist dentist = activeDentist("Dra. Laura Villamizar");
        String name = "Blanqueamiento " + UUID.randomUUID();

        mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":60,"dentistIds":[%d]}
                                """.formatted(name, dentist.id())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.durationMinutes").value(60))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.dentistIds", contains(dentist.id().intValue())));

        mockMvc.perform(get("/api/v1/public/procedures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == '%s')].dentistIds".formatted(name),
                        hasItem(contains(dentist.id().intValue()))));
    }

    @Test
    @DisplayName("CP-RF12-03: creating a procedure without any dentist is rejected")
    void rejectsProcedureWithoutDentists() throws Exception {
        String token = tokenFor(Role.AUXILIAR);

        mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30,"dentistIds":[]}
                                """.formatted(uniqueName("Sin odontólogo"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROCEDURE_DATA"))
                .andExpect(jsonPath("$.detail").value("Seleccione al menos un odontólogo."));
    }

    @Test
    @DisplayName("CP-RF12-04: creating a procedure with an inactive or unknown dentist is rejected")
    void rejectsInactiveOrUnknownDentist() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        Dentist inactive = inactiveDentist("Dr. Andrés Peña");

        mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30,"dentistIds":[%d]}
                                """.formatted(uniqueName("Con inactivo"), inactive.id())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROCEDURE_DATA"))
                .andExpect(jsonPath("$.detail").value("El odontólogo seleccionado no está activo."));

        mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30,"dentistIds":[999999]}
                                """.formatted(uniqueName("Con inexistente"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROCEDURE_DATA"))
                .andExpect(jsonPath("$.detail").value("El odontólogo seleccionado no está activo."));
    }

    @Test
    @DisplayName("CP-RF12-05: the odontologo cannot create or edit a procedure")
    void odontologoCannotManageProcedures() throws Exception {
        String token = tokenFor(Role.ODONTOLOGO);
        Dentist dentist = activeDentist("Dra. Camila Ortiz");

        mockMvc.perform(post("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","durationMinutes":30,"dentistIds":[%d]}
                                """.formatted(uniqueName("Prohibido"), dentist.id())))
                .andExpect(status().isForbidden());

        String auxiliarToken = tokenFor(Role.AUXILIAR);
        MvcResult created = createProcedure(auxiliarToken, uniqueName("Editable"), 30, List.of(dentist.id()));
        created.getResponse().setCharacterEncoding("UTF-8");
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/v1/procedures/%d/dentists".formatted(id.longValue()))
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dentistIds":[%d]}
                                """.formatted(dentist.id())))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/procedures/%d/desactivar".formatted(id.longValue()))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CP-RF12-03: replacing the dentists with an empty list is rejected")
    void rejectsReplacingDentistsWithAnEmptyList() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        Dentist dentist = activeDentist("Dra. Laura Villamizar");
        MvcResult created = createProcedure(token, uniqueName("Sin reemplazo"), 30, List.of(dentist.id()));
        created.getResponse().setCharacterEncoding("UTF-8");
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/v1/procedures/%d/dentists".formatted(id.longValue()))
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dentistIds":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROCEDURE_DATA"))
                .andExpect(jsonPath("$.detail").value("Seleccione al menos un odontólogo."));
    }

    @Test
    @DisplayName("CP-RF09-04: replacing dentists without a token answers HTTP 401")
    void replacingDentistsWithoutTokenAnswersUnauthorized() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        Dentist dentist = activeDentist("Dra. Laura Villamizar");
        MvcResult created = createProcedure(token, uniqueName("Sin sesión"), 30, List.of(dentist.id()));
        created.getResponse().setCharacterEncoding("UTF-8");
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/v1/procedures/%d/dentists".formatted(id.longValue()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dentistIds":[%d]}
                                """.formatted(dentist.id())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("S1: replacing the dentists of a procedure keeps only the new ones")
    void replacesProcedureDentists() throws Exception {
        String token = tokenFor(Role.AUXILIAR);
        Dentist first = activeDentist("Dra. Laura Villamizar");
        Dentist second = activeDentist("Dr. Andrés Peña");
        MvcResult created = createProcedure(token, uniqueName("Con reemplazo"), 45, List.of(first.id()));
        created.getResponse().setCharacterEncoding("UTF-8");
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/v1/procedures/%d/dentists".formatted(id.longValue()))
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dentistIds":[%d]}
                                """.formatted(second.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dentistIds", contains(second.id().intValue())));

        mockMvc.perform(get("/api/v1/procedures")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == %d)].dentistIds".formatted(id.longValue()),
                        hasItem(contains(second.id().intValue()))))
                .andExpect(jsonPath("$[?(@.id == %d)].dentistIds".formatted(id.longValue()),
                        hasItem(not(hasItem(first.id().intValue())))));
    }
}
