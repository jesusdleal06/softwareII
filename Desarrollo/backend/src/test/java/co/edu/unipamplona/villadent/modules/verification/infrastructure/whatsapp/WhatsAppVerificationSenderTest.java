package co.edu.unipamplona.villadent.modules.verification.infrastructure.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.verification.domain.error.VerificationDeliveryException;
import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WhatsAppVerificationSenderTest {

    private static final String PHONE = "3143625362";
    private static final String CODE = "123456";
    private static final String TEMPLATE = "verificacion_villadent";

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    private String startServer(AtomicReference<String> body) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @Test
    @DisplayName("CP-RF02-04: the authentication template carries the code in the body and the URL button")
    void theAuthenticationTemplateCarriesTheCode() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        var sender = new WhatsAppVerificationSender(startServer(body), "token", "123", TEMPLATE);

        sender.sendVerificationCode(PHONE, CODE);

        String payload = body.get();
        assertThat((String) JsonPath.read(payload, "$.messaging_product")).isEqualTo("whatsapp");
        assertThat((String) JsonPath.read(payload, "$.type")).isEqualTo("template");
        assertThat((String) JsonPath.read(payload, "$.template.name")).isEqualTo(TEMPLATE);
        assertThat((String) JsonPath.read(payload, "$.template.language.code")).isEqualTo("es");

        List<String> bodyTexts =
                JsonPath.read(payload, "$.template.components[?(@.type == 'body')].parameters[*].text");
        assertThat(bodyTexts).containsExactly(CODE);

        List<String> buttonTypes =
                JsonPath.read(payload, "$.template.components[?(@.type == 'button')].sub_type");
        assertThat(buttonTypes).containsExactly("url");
        List<String> buttonIndexes =
                JsonPath.read(payload, "$.template.components[?(@.type == 'button')].index");
        assertThat(buttonIndexes).containsExactly("0");
        List<String> buttonTexts =
                JsonPath.read(payload, "$.template.components[?(@.type == 'button')].parameters[*].text");
        assertThat(buttonTexts).containsExactly(CODE);
    }

    @Test
    @DisplayName("CP-RF02-04: the recipient carries the Colombian country code")
    void theRecipientUsesTheColombianCountryCode() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        var sender = new WhatsAppVerificationSender(startServer(body), "token", "123", TEMPLATE);

        sender.sendVerificationCode(PHONE, CODE);

        assertThat((String) JsonPath.read(body.get(), "$.to")).isEqualTo("573143625362");
    }

    @Test
    @DisplayName("CP-RF02-04: an unconfigured sender reports the delivery failure")
    void anUnconfiguredSenderReportsTheDeliveryFailure() {
        var sender = new WhatsAppVerificationSender("http://localhost:1", "token", "123", " ");

        assertThatThrownBy(() -> sender.sendVerificationCode(PHONE, CODE))
                .isInstanceOf(VerificationDeliveryException.class)
                .hasMessage("No pudimos enviar el código. Intenta de nuevo en unos minutos.");
    }
}
