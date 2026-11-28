package co.edu.unipamplona.villadent.modules.verification.infrastructure.whatsapp;

import co.edu.unipamplona.villadent.modules.verification.domain.error.VerificationDeliveryException;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import co.edu.unipamplona.villadent.shared.whatsapp.InternationalPhoneFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

public class WhatsAppVerificationSender implements VerificationSender {

    private final RestClient restClient;
    private final String token;
    private final String phoneNumberId;
    private final String templateName;

    public WhatsAppVerificationSender(
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
    public void sendVerificationCode(String phone, String code) {
        if (isBlank(token) || isBlank(phoneNumberId) || isBlank(templateName)) {
            throw new VerificationDeliveryException();
        }

        Map<String, Object> bodyParameter = Map.of("type", "text", "text", code);
        Map<String, Object> bodyComponent = Map.of(
                "type", "body",
                "parameters", List.of(bodyParameter));
        Map<String, Object> buttonParameter = Map.of("type", "text", "text", code);
        Map<String, Object> buttonComponent = Map.of(
                "type", "button",
                "sub_type", "url",
                "index", "0",
                "parameters", List.of(buttonParameter));
        Map<String, Object> template = Map.of(
                "name", templateName,
                "language", Map.of("code", "es"),
                "components", List.of(bodyComponent, buttonComponent));
        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", InternationalPhoneFormatter.toInternational(phone),
                "type", "template",
                "template", template);

        try {
            restClient.post()
                    .uri("/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException exception) {
            throw new VerificationDeliveryException(exception);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
