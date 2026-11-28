package co.edu.unipamplona.villadent.shared.e2e;

import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("e2e")
public class InMemoryVerificationSender implements VerificationSender {

    private final Map<String, String> codesByPhone = new ConcurrentHashMap<>();
    private final List<SentVerificationCode> messages = new CopyOnWriteArrayList<>();

    @Override
    public void sendVerificationCode(String phone, String code) {
        codesByPhone.put(phone, code);
        messages.add(new SentVerificationCode(phone, code));
    }

    public Optional<String> codeFor(String phone) {
        return Optional.ofNullable(codesByPhone.get(phone));
    }

    public List<SentVerificationCode> messages() {
        return List.copyOf(messages);
    }

    public void clear() {
        codesByPhone.clear();
        messages.clear();
    }

    public record SentVerificationCode(String phone, String code) {
    }
}
