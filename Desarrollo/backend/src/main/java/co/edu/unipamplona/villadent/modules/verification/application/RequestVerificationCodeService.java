package co.edu.unipamplona.villadent.modules.verification.application;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.TooManyCodeRequestsException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.VerificationDeliveryException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.RequestVerificationCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.transaction.annotation.Transactional;

public class RequestVerificationCodeService implements RequestVerificationCodeUseCase {

    private final NormalizePhoneUseCase phones;
    private final VerificationCodeRepository codes;
    private final VerificationSender sender;
    private final VerificationSecrets secrets;
    private final Clock clock;
    private final int maxCodesPerPhonePerHour;
    private final int maxCodesPerIpPerHour;

    public RequestVerificationCodeService(
            NormalizePhoneUseCase phones,
            VerificationCodeRepository codes,
            VerificationSender sender,
            VerificationSecrets secrets,
            Clock clock,
            int maxCodesPerPhonePerHour,
            int maxCodesPerIpPerHour) {
        this.phones = phones;
        this.codes = codes;
        this.sender = sender;
        this.secrets = secrets;
        this.clock = clock;
        this.maxCodesPerPhonePerHour = maxCodesPerPhonePerHour;
        this.maxCodesPerIpPerHour = maxCodesPerIpPerHour;
    }

    @Override
    @Transactional(noRollbackFor = VerificationDeliveryException.class)
    public void request(RequestCodeCommand command) {
        String phone = phones.normalize(command.phone());
        Instant now = clock.instant();
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);
        codes.lockPhoneRequests(phone);
        if (hasClientIp(command)) {
            codes.lockClientIpRequests(command.clientIp());
        }
        if (codes.countByPhoneSince(phone, oneHourAgo) >= maxCodesPerPhonePerHour) {
            throw new TooManyCodeRequestsException();
        }
        if (hasClientIp(command) && codes.countByClientIpSince(command.clientIp(), oneHourAgo)
                >= maxCodesPerIpPerHour) {
            throw new TooManyCodeRequestsException();
        }

        String code = secrets.newCode();
        codes.invalidateActiveByPhone(phone);
        PhoneVerificationCode saved = codes.save(PhoneVerificationCode.issue(
                phone,
                secrets.hash(code),
                now,
                now.plus(PhoneVerificationCode.VALIDITY_MINUTES, ChronoUnit.MINUTES),
                command.clientIp()));
        try {
            sender.sendVerificationCode(phone, code);
        } catch (RuntimeException exception) {
            codes.save(saved.invalidate());
            throw new VerificationDeliveryException(exception);
        }
    }

    private boolean hasClientIp(RequestCodeCommand command) {
        return command.clientIp() != null && !command.clientIp().isBlank();
    }
}
