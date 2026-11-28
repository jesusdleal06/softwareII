package co.edu.unipamplona.villadent.modules.verification.application;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.CodeExpiredException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.InvalidCodeException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.TooManyAttemptsException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationTokenRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.transaction.annotation.Transactional;

public class VerifyPhoneCodeService implements VerifyPhoneCodeUseCase {

    private final NormalizePhoneUseCase phones;
    private final VerificationCodeRepository codes;
    private final VerificationTokenRepository tokens;
    private final VerificationSecrets secrets;
    private final Clock clock;

    public VerifyPhoneCodeService(
            NormalizePhoneUseCase phones,
            VerificationCodeRepository codes,
            VerificationTokenRepository tokens,
            VerificationSecrets secrets,
            Clock clock) {
        this.phones = phones;
        this.codes = codes;
        this.tokens = tokens;
        this.secrets = secrets;
        this.clock = clock;
    }

    @Override
    @Transactional(noRollbackFor = {InvalidCodeException.class, TooManyAttemptsException.class})
    public VerificationResult verify(VerifyCodeCommand command) {
        String phone = phones.normalize(command.phone());
        Instant now = clock.instant();
        PhoneVerificationCode code = codes.findLatestByPhone(phone)
                .orElseThrow(CodeExpiredException::new);
        if (!code.isUsable(now)) {
            throw new CodeExpiredException();
        }
        boolean matches = command.code() != null
                && !command.code().isBlank()
                && code.codeHash().equals(secrets.hash(command.code()));
        if (!matches) {
            PhoneVerificationCode failed = codes.registerWrongAttempt(code.id(), now)
                    .orElseThrow(CodeExpiredException::new);
            if (failed.invalidated()) {
                throw new TooManyAttemptsException();
            }
            throw new InvalidCodeException();
        }

        if (!codes.markUsedIfUsable(code.id(), now)) {
            throw new CodeExpiredException();
        }
        String rawToken = secrets.newToken();
        tokens.save(VerificationToken.issue(
                secrets.hash(rawToken),
                phone,
                now,
                now.plus(VerificationToken.VALIDITY_MINUTES, ChronoUnit.MINUTES)));
        return new VerificationResult(rawToken);
    }
}
