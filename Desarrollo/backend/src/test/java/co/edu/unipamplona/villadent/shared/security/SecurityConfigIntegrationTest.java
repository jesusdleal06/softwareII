package co.edu.unipamplona.villadent.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@Import(co.edu.unipamplona.villadent.TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.bootstrap-admin.enabled=false")
@AutoConfigureMockMvc
class SecurityConfigIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anUnknownPublicPathIsNotFoundNotUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/public/does-not-exist")).andExpect(status().isNotFound());
    }

    @Test
    void publicDentistsArePermitted() throws Exception {
        mockMvc.perform(get("/api/v1/public/dentists")).andExpect(status().isOk());
    }

    @Test
    void protectedEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/appointments")).andExpect(status().isUnauthorized());
    }
}
