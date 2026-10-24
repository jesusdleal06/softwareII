package co.edu.unipamplona.villadent.modules.reminders.infrastructure.whatsapp;

import co.edu.unipamplona.villadent.modules.reminders.domain.error.ReminderDeliveryException;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

public class WhatsAppReminderSender implements ReminderSender {

    private final RestClient restClient;
    private final String token;
    private final String phoneNumberId;
    private final String templateName;

    public WhatsAppReminderSender(
            String apiUrl,
            String token,
            String phoneNumberId,
            String templateName) {
        this.restClient = RestClient.builder().baseUrl(apiUrl).build();
        this.token = token;
        this.phoneNumberId = phoneNumberId;
        this.templateName = templateName;
    }

    @Override
    public void send(ReminderMessage message) {
        if (token == null || token.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()
                || templateName == null || templateName.isBlank()) {
            throw new ReminderDeliveryException("WhatsApp no está configurado.");
        }
        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", message.phone(),
                "type", "template",
                "template", Map.of(
                        "name", templateName,
                        "language", Map.of("code", "es"),
                        "components", List.of(
                                Map.of("type", "body", "parameters", List.of(
                                        text(message.patientName()),
                                        text(message.date().toString()),
                                        text(message.time().toString()),
                                        text(message.dentistName()),
                                        text(message.procedureName()))),
                                Map.of("type", "button", "sub_type", "url", "index", "0",
                                        "parameters", List.of(text(message.manageUrl()))))));
        restClient.post()
                .uri("/{phoneNumberId}/messages", phoneNumberId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
    }

    private static Map<String, String> text(String value) {
        return Map.of("type", "text", "text", value == null ? "" : value);
    }
}
