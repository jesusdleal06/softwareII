package co.edu.unipamplona.villadent.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

/**
 * Runs against the real embedded server. MockMvc does not forward a 404 or a
 * thrown exception to /error, so it cannot catch a security rule that blocks
 * the error dispatch and turns every public error into a 401.
 */
@Import(co.edu.unipamplona.villadent.TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecurityConfigServerTest {

    private final HttpClient client = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    private int status(String method, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    @DisplayName("A public path without a handler answers 404, not 401")
    void publicPathWithoutHandlerIsNotFound() throws Exception {
        assertThat(status("GET", "/api/v1/public/dentists")).isEqualTo(404);
    }

    @Test
    @DisplayName("The login path is reachable without a token")
    void loginPathIsNotBlockedBySecurity() throws Exception {
        assertThat(status("POST", "/api/v1/auth/login")).isNotEqualTo(401);
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
