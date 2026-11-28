package co.edu.unipamplona.villadent.support;

import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Test double for the WhatsApp verification sender: keeps the last code sent to each phone so a
 * test can complete the verification flow without calling Meta.
 */
public class CapturingVerificationSender implements VerificationSender {

    private final Map<String, String> codes = new ConcurrentHashMap<>();
    private final List<SentCode> messages = new CopyOnWriteArrayList<>();
    private volatile RuntimeException failure;

    @Override
    public void sendVerificationCode(String phone, String code) {
        if (failure != null) {
            throw failure;
        }
        codes.put(phone, code);
        messages.add(new SentCode(phone, code));
    }

    public Optional<String> latestCode(String phone) {
        return Optional.ofNullable(codes.get(phone));
    }

    public List<SentCode> messages() {
        return List.copyOf(messages);
    }

    public void failWith(RuntimeException failure) {
        this.failure = failure;
    }

    public void succeed() {
        this.failure = null;
    }

    public void clear() {
        codes.clear();
        messages.clear();
    }

    public record SentCode(String phone, String code) {
    }
}
