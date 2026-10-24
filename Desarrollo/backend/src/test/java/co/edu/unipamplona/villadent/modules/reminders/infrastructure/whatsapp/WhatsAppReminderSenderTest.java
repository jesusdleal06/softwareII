package co.edu.unipamplona.villadent.modules.reminders.infrastructure.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.reminders.domain.error.ReminderDeliveryException;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
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
                "http://localhost:4200/cita/token");
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
                .contains("\"type\":\"template\"")
                .contains("http://localhost:4200/cita/token");
    }

    @Test
    void nullNamesBecomeEmptyParameters() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        String url = startServer(body);
        var sender = new WhatsAppReminderSender(url, "token", "123", "reminder");

        sender.send(new ReminderMessage(
                null, "3001234567", LocalDate.of(2026, 10, 26), LocalTime.of(10, 0),
                null, null, "http://localhost:4200/cita/token"));

        assertThat(body.get()).contains("\"text\":\"\"");
    }
}
