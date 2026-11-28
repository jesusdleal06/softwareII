package co.edu.unipamplona.villadent.modules.verification.application;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.PhoneNotVerifiedException;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.ConsumeVerificationTokenUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationTokenRepository;
import java.time.Clock;
import org.springframework.transaction.annotation.Transactional;

public class ConsumeVerificationTokenService implements ConsumeVerificationTokenUseCase {

    private final VerificationTokenRepository tokens;
    private final VerificationSecrets secrets;
    private final NormalizePhoneUseCase phones;
    private final Clock clock;

    public ConsumeVerificationTokenService(
            VerificationTokenRepository tokens,
            VerificationSecrets secrets,
            NormalizePhoneUseCase phones,
            Clock clock) {
        this.tokens = tokens;
        this.secrets = secrets;
        this.phones = phones;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void consume(String rawToken, String phone) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new PhoneNotVerifiedException();
        }
        String normalizedPhone = phones.normalize(phone);
        boolean consumed = tokens.consume(
                secrets.hash(rawToken), normalizedPhone, clock.instant());
        if (!consumed) {
            throw new PhoneNotVerifiedException();
        }
    }
}
