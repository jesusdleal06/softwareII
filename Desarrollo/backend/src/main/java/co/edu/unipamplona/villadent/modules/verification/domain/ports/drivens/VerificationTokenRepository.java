package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import java.time.Instant;

public interface VerificationTokenRepository {

    VerificationToken save(VerificationToken token);

    /**
     * Atomically marks the token as used when it exists, matches the phone,
     * has not been used and has not expired.
     *
     * @return true when this call consumed the token.
     */
    boolean consume(String tokenHash, String phone, Instant now);
}
