package co.edu.unipamplona.villadent.modules.reports.infrastructure.cloudinary;

import static java.nio.charset.StandardCharsets.ISO_8859_1;
import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;

import co.edu.unipamplona.villadent.shared.cloudinary.CloudinaryClient;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CloudinaryReportStorageTest {

    @Test
    @DisplayName("CP-RF10-09 and CP-RF10-11: signs authenticated raw upload and private download")
    void transfersPrivatePdf() throws Exception {
        byte[] pdf = "%PDF-1.7".getBytes(UTF_8);
        var upload = new AtomicReference<String>();
        var download = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1_1/test-cloud/raw/upload", exchange -> {
            try (exchange) {
                upload.set(exchange.getRequestMethod() + "\n"
                        + new String(exchange.getRequestBody().readAllBytes(), ISO_8859_1));
                byte[] json = """
                        {"public_id":"villadent/reports/report+.pdf","secure_url":"https://example.test/private"}
                        """.getBytes(UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, json.length);
                exchange.getResponseBody().write(json);
            }
        });
        server.createContext("/v1_1/test-cloud/raw/download", exchange -> {
            try (exchange) {
                download.set(exchange.getRequestMethod() + "\n" + exchange.getRequestURI().getRawQuery());
                exchange.sendResponseHeaders(200, pdf.length);
                exchange.getResponseBody().write(pdf);
            }
        });
        server.start();
        try {
            var client = new CloudinaryClient(Clock.fixed(Instant.ofEpochSecond(1700000000), ZoneOffset.UTC),
                    "test-cloud", "test-key", "test-secret", "http://127.0.0.1:" + server.getAddress().getPort());
            var storage = new CloudinaryReportStorage(client);
            String id = storage.upload(pdf);
            assertThat(id).isEqualTo("villadent/reports/report+.pdf");
            assertThat(upload.get()).startsWith("POST\n").contains(
                    "name=\"file\"; filename=\"report.pdf\"", "Content-Type: application/pdf", "%PDF-1.7",
                    "name=\"folder\"", "villadent/reports", "name=\"type\"", "authenticated",
                    "name=\"timestamp\"", "1700000000", "name=\"api_key\"", "test-key",
                    "6825e0aba960387136bb0c70b0068211214de897");
            var output = new ByteArrayOutputStream();
            storage.download(id, output);
            assertThat(output.toByteArray()).isEqualTo(pdf);
            assertThat(download.get()).startsWith("GET\n").contains("%2B");
            assertThat(URLDecoder.decode(download.get(), UTF_8)).contains(
                    "public_id=villadent/reports/report+.pdf", "timestamp=1700000000",
                    "type=authenticated", "api_key=test-key", "signature=a313ac6c0688b4896f4e5f9c9c45b78585b9f717");
        } finally {
            server.stop(0);
        }
    }
}
