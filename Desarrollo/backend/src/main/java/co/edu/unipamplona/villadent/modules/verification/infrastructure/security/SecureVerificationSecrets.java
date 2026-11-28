package co.edu.unipamplona.villadent.modules.verification.infrastructure.security;

import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

public class SecureVerificationSecrets implements VerificationSecrets {

    private static final int TOKEN_BYTES = 32;
    private static final int CODE_BOUND = 1_000_000;

    private final SecureRandom random = new SecureRandom();

    @Override
    public String newCode() {
        return "%06d".formatted(random.nextInt(CODE_BOUND));
    }

    @Override
    public String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    public String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}
