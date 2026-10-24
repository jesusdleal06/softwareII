package co.edu.unipamplona.villadent.modules.reminders.infrastructure.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.reminders.domain.error.ReminderDeliveryException;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WhatsAppReminderSenderTest {

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

    private ReminderMessage message() {
        return new ReminderMessage(
                "Ana María Rueda", "3001234567", LocalDate.of(2026, 10, 26),
                LocalTime.of(10, 0), "Dra. Laura Villamizar", "Limpieza",
                "https://villadent.example/cita/token-abc", "token-abc");
    }

    @Test
    void anUnconfiguredSenderFails() {
        var sender = new WhatsAppReminderSender("http://localhost:1", "", "", "");

        assertThatThrownBy(() -> sender.send(message()))
                .isInstanceOf(ReminderDeliveryException.class)
                .hasMessage("WhatsApp no está configurado.");
    }

    @Test
    void aNullTokenIsTreatedAsUnconfigured() {
        var sender = new WhatsAppReminderSender("http://localhost:1", null, "123", "reminder");

        assertThatThrownBy(() -> sender.send(message()))
                .isInstanceOf(ReminderDeliveryException.class);
    }

    @Test
    void aMissingPhoneNumberIsUnconfigured() {
        var sender = new WhatsAppReminderSender("http://localhost:1", "token", null, "reminder");

        assertThatThrownBy(() -> sender.send(message()))
                .isInstanceOf(ReminderDeliveryException.class);
    }

    @Test
    void aBlankTemplateNameIsUnconfigured() {
        var sender = new WhatsAppReminderSender("http://localhost:1", "token", "123", " ");

        assertThatThrownBy(() -> sender.send(message()))
                .isInstanceOf(ReminderDeliveryException.class);
    }

    @Test
    void aConfiguredSenderPostsTheTemplate() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        String url = startServer(body);
        var sender = new WhatsAppReminderSender(url, "token", "123", "reminder");

        sender.send(message());

        assertThat(body.get()).contains("\"messaging_product\":\"whatsapp\"")
                .contains("\"type\":\"template\"");
    }

    @Test
    @DisplayName("CP-RF05-01: the URL button carries only the manage token, not a whole URL")
    void theUrlButtonCarriesOnlyTheToken() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        var sender = new WhatsAppReminderSender(startServer(body), "token", "123", "reminder");

        sender.send(message());

        // The approved template holds the fixed prefix (https://.../cita/); WhatsApp appends this suffix.
        List<String> button = JsonPath.read(body.get(), "$.template.components[?(@.type == 'button')].parameters[0].text");
        assertThat(button).containsExactly("token-abc");
        assertThat(body.get()).doesNotContain("/cita/");
    }

    @Test
    @DisplayName("CP-RF05-01: the body shows the date and time as the in-app WhatsApp preview does")
    void theBodyUsesThePreviewFormats() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        var sender = new WhatsAppReminderSender(startServer(body), "token", "123", "reminder");

        sender.send(message());

        List<String> texts = JsonPath.read(body.get(), "$.template.components[?(@.type == 'body')].parameters[*].text");
        assertThat(texts).containsExactly(
                "Ana María Rueda", "26/10/2026", "10:00 AM", "Dra. Laura Villamizar", "Limpieza");
    }

    @Test
    void afternoonTimesUseTheTwelveHourClock() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        var sender = new WhatsAppReminderSender(startServer(body), "token", "123", "reminder");

        sender.send(new ReminderMessage(
                "Ana María Rueda", "3001234567", LocalDate.of(2026, 10, 26), LocalTime.of(14, 30),
                "Dra. Laura Villamizar", "Limpieza", "https://villadent.example/cita/t", "t"));

        List<String> texts = JsonPath.read(body.get(), "$.template.components[?(@.type == 'body')].parameters[*].text");
        assertThat(texts).contains("2:30 PM");
    }

    @Test
    void nullNamesBecomeEmptyParameters() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        String url = startServer(body);
        var sender = new WhatsAppReminderSender(url, "token", "123", "reminder");

        sender.send(new ReminderMessage(
                null, "3001234567", LocalDate.of(2026, 10, 26), LocalTime.of(10, 0),
                null, null, "https://villadent.example/cita/token-abc", "token-abc"));

        assertThat(body.get()).contains("\"text\":\"\"");
    }
}
