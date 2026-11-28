package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import java.time.Instant;
import java.util.Optional;

public interface VerificationCodeRepository {

    PhoneVerificationCode save(PhoneVerificationCode code);

    Optional<PhoneVerificationCode> findLatestByPhone(String phone);

    long countByPhoneSince(String phone, Instant since);

    long countByClientIpSince(String clientIp, Instant since);

    void invalidateActiveByPhone(String phone);

    /**
     * Atomically counts one wrong attempt. Returns empty when the code is no longer usable, so parallel
     * guesses cannot exceed the maximum number of attempts.
     */
    Optional<PhoneVerificationCode> registerWrongAttempt(Long id, Instant now);

    /**
     * Atomically marks the code as used when it is still usable, so a single code issues at most one token.
     */
    boolean markUsedIfUsable(Long id, Instant now);

    /**
     * Serializes concurrent code requests for the same phone inside the current transaction.
     */
    void lockPhoneRequests(String phone);

    /**
     * Serializes concurrent code requests from the same client IP inside the current transaction.
     */
    void lockClientIpRequests(String clientIp);
}
