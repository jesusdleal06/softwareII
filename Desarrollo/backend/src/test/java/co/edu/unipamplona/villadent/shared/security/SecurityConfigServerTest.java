package co.edu.unipamplona.villadent.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

/**
 * Runs against the real embedded server. MockMvc does not forward a 404 or a
 * thrown exception to /error, so it cannot catch a security rule that blocks
 * the error dispatch and turns every public error into a 401.
 */
@Import(co.edu.unipamplona.villadent.TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.bootstrap-admin.enabled=false")
class SecurityConfigServerTest {

    private final HttpClient client = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordHasher passwordHasher;

    private int status(String method, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private int loginStatus(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private String createUser() {
        String email = "login-" + UUID.randomUUID() + "@villadent.co";
        users.save(User.create("Usuario de prueba", email, passwordHasher.hash("clave-segura"), Role.AUXILIAR));
        return email;
    }

    @Test
    @DisplayName("A public path without a handler answers 404, not 401")
    void publicPathWithoutHandlerIsNotFound() throws Exception {
        assertThat(status("GET", "/api/v1/public/does-not-exist")).isEqualTo(404);
    }

    @Test
    @DisplayName("The public dentists endpoint answers 200 without a token")
    void publicDentistsEndpointIsPermitted() throws Exception {
        assertThat(status("GET", "/api/v1/public/dentists")).isEqualTo(200);
    }

    @Test
    @DisplayName("CP-RF09-02: a wrong password answers 401")
    void wrongPasswordIsUnauthorized() throws Exception {
        String email = createUser();

        assertThat(loginStatus(email, "clave-incorrecta")).isEqualTo(401);
    }

    @Test
    @DisplayName("Valid credentials answer 200")
    void validCredentialsAreAccepted() throws Exception {
        String email = createUser();

        assertThat(loginStatus(email, "clave-segura")).isEqualTo(200);
    }

    @Test
    @DisplayName("CP-RF09-04: a protected path without a token answers 401")
    void protectedPathWithoutTokenIsUnauthorized() throws Exception {
        assertThat(status("GET", "/api/v1/appointments")).isEqualTo(401);
    }

    @Test
    @DisplayName("The health check is public")
    void healthIsPublic() throws Exception {
        assertThat(status("GET", "/actuator/health")).isEqualTo(200);
    }
}
