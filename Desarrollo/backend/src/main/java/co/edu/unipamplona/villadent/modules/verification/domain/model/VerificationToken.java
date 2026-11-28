package co.edu.unipamplona.villadent.modules.verification.domain.model;

import java.time.Instant;

/**
 * A short lived, single use proof that a phone number was verified.
 * Only the SHA-256 hash of the token is kept.
 */
public final class VerificationToken {

    public static final int VALIDITY_MINUTES = 15;

    private final Long id;
    private final String tokenHash;
    private final String phone;
    private final Instant expiresAt;
    private final Instant usedAt;
    private final Instant createdAt;

    public VerificationToken(
            Long id,
            String tokenHash,
            String phone,
            Instant expiresAt,
            Instant usedAt,
            Instant createdAt) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.phone = phone;
        this.expiresAt = expiresAt;
        this.usedAt = usedAt;
        this.createdAt = createdAt;
    }

    public static VerificationToken issue(
            String tokenHash,
            String phone,
            Instant createdAt,
            Instant expiresAt) {
        return new VerificationToken(null, tokenHash, phone, expiresAt, null, createdAt);
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public Long id() {
        return id;
    }

    public String tokenHash() {
        return tokenHash;
    }

    public String phone() {
        return phone;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Instant usedAt() {
        return usedAt;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
