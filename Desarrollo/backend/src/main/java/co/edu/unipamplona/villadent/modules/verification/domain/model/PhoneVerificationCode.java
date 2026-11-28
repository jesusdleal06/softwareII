package co.edu.unipamplona.villadent.modules.verification.domain.model;

import java.time.Instant;

/**
 * A one-time code requested to prove that a patient owns a phone number.
 * Only the SHA-256 hash of the code is kept.
 */
public final class PhoneVerificationCode {

    public static final int MAX_ATTEMPTS = 3;
    public static final int VALIDITY_MINUTES = 5;

    private final Long id;
    private final String phone;
    private final String codeHash;
    private final Instant expiresAt;
    private final int attempts;
    private final boolean used;
    private final boolean invalidated;
    private final String clientIp;
    private final Instant createdAt;

    public PhoneVerificationCode(
            Long id,
            String phone,
            String codeHash,
            Instant expiresAt,
            int attempts,
            boolean used,
            boolean invalidated,
            String clientIp,
            Instant createdAt) {
        this.id = id;
        this.phone = phone;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.attempts = attempts;
        this.used = used;
        this.invalidated = invalidated;
        this.clientIp = clientIp;
        this.createdAt = createdAt;
    }

    public static PhoneVerificationCode issue(
            String phone,
            String codeHash,
            Instant createdAt,
            Instant expiresAt,
            String clientIp) {
        return new PhoneVerificationCode(
                null, phone, codeHash, expiresAt, 0, false, false, clientIp, createdAt);
    }

    public PhoneVerificationCode registerWrongAttempt() {
        int nextAttempts = attempts + 1;
        return new PhoneVerificationCode(
                id,
                phone,
                codeHash,
                expiresAt,
                nextAttempts,
                used,
                nextAttempts >= MAX_ATTEMPTS,
                clientIp,
                createdAt);
    }

    public PhoneVerificationCode invalidate() {
        return new PhoneVerificationCode(
                id, phone, codeHash, expiresAt, attempts, used, true, clientIp, createdAt);
    }

    public PhoneVerificationCode markUsed() {
        return new PhoneVerificationCode(
                id, phone, codeHash, expiresAt, attempts, true, invalidated, clientIp, createdAt);
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public boolean isUsable(Instant now) {
        return !used && !invalidated && !isExpired(now);
    }

    public Long id() {
        return id;
    }

    public String phone() {
        return phone;
    }

    public String codeHash() {
        return codeHash;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public int attempts() {
        return attempts;
    }

    public boolean used() {
        return used;
    }

    public boolean invalidated() {
        return invalidated;
    }

    public String clientIp() {
        return clientIp;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
