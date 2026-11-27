package co.edu.unipamplona.villadent.modules.dentists.infrastructure.cloudinary;

import static java.nio.charset.StandardCharsets.ISO_8859_1;
import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.dentists.application.DentistProfileService;
import co.edu.unipamplona.villadent.modules.dentists.domain.error.DentistPhotoUploadException;
import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ImageStorage.StoredImage;
import co.edu.unipamplona.villadent.shared.cloudinary.CloudinaryClient;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;

class CloudinaryImageStorageTest {
    private static final byte[] PHOTO = {(byte) 0x89, 'P', 'N', 'G', 0, (byte) 0xff};
    private static final String PHOTO_URL = "https://example.test/photo.png";
    private static final String PUBLIC_ID = "villadent/dentists/photo";
    private final AtomicReference<UploadRequest> request = new AtomicReference<>();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("CP-RF11-05: uploads the photo to Cloudinary as signed multipart")
    void uploadsSignedMultipart() throws IOException {
        var storage = cloudinaryResponding(200, """
                {"secure_url":"https://example.test/photo.png","public_id":"villadent/dentists/photo"}
                """);

        assertThat(storage.upload(PHOTO, "image/png")).isEqualTo(new StoredImage(PHOTO_URL, PUBLIC_ID));

        UploadRequest received = request.get();
        assertThat(received.method()).isEqualTo("POST");
        assertThat(received.path()).isEqualTo("/v1_1/test-cloud/image/upload");
        MediaType contentType = MediaType.parseMediaType(received.contentType());
        assertThat(contentType.isCompatibleWith(MediaType.MULTIPART_FORM_DATA)).isTrue();
        String boundary = contentType.getParameter("boundary");
        assertThat(boundary).isNotBlank();
        assertThat(received.body().split(Pattern.quote("--" + boundary))).hasSize(7);
        assertThat(received.body()).contains(
                "name=\"file\"; filename=\"profile-photo\"\r\n",
                "Content-Type: image/png\r\n",
                "\r\n\r\n" + new String(PHOTO, ISO_8859_1) + "\r\n--" + boundary);
        assertPart(received.body(), "folder", "villadent/dentists", boundary);
        assertPart(received.body(), "timestamp", "1700000000", boundary);
        assertPart(received.body(), "api_key", "test-key", boundary);
        assertPart(received.body(), "signature", "34ff9e9d053d4c90f02fbb878951ed96fc9dd122", boundary);
    }

    @Test
    @DisplayName("CP-RF11-07: Cloudinary rejection produces a 502 and does not replace the previous photo")
    void keepsPreviousPhotoWhenCloudinaryRejectsUpload() throws IOException {
        var storage = cloudinaryResponding(401, """
                {"error":{"message":"Invalid credentials"}}
                """);
        var dentists = mock(DentistRepository.class);
        var previous = Dentist.create("Laura Pena", null, 7L).replacePhoto(PHOTO_URL, PUBLIC_ID);
        when(dentists.findByUserId(7L)).thenReturn(Optional.of(previous));
        var service = new DentistProfileService(dentists, storage);

        assertThatExceptionOfType(DentistPhotoUploadException.class)
                .isThrownBy(() -> service.replace(7L, PHOTO))
                .withMessage("No pudimos subir la imagen. Intenta de nuevo.")
                .withCauseInstanceOf(HttpClientErrorException.Unauthorized.class)
                .satisfies(error -> assertThat(error.getStatus()).isEqualTo(502));
        verify(dentists).findByUserId(7L);
        verifyNoMoreInteractions(dentists);
        assertThat(previous.profile().photoUrl()).isEqualTo(PHOTO_URL);
        assertThat(previous.profile().photoPublicId()).isEqualTo(PUBLIC_ID);
    }

    private CloudinaryImageStorage cloudinaryResponding(int status, String response) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            try (exchange) {
                request.set(new UploadRequest(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                        exchange.getRequestHeaders().getFirst("Content-Type"),
                        new String(exchange.getRequestBody().readAllBytes(), ISO_8859_1)));
                byte[] json = response.getBytes(UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, json.length);
                exchange.getResponseBody().write(json);
            }
        });
        server.start();
        Clock clock = Clock.fixed(Instant.ofEpochSecond(1700000000), ZoneOffset.UTC);
        return new CloudinaryImageStorage(new CloudinaryClient(clock, "test-cloud", "test-key", "test-secret",
                "http://127.0.0.1:" + server.getAddress().getPort()));
    }

    private static void assertPart(String body, String name, String value, String boundary) {
        assertThat(body).containsPattern("name=\"" + name + "\"\r\n(?:[^\r\n]+\r\n)*\r\n"
                + Pattern.quote(value + "\r\n--" + boundary));
    }

    private record UploadRequest(String method, String path, String contentType, String body) {}
}
