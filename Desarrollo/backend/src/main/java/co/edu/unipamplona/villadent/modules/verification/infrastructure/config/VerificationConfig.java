package co.edu.unipamplona.villadent.modules.verification.infrastructure.config;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.application.ConsumeVerificationTokenService;
import co.edu.unipamplona.villadent.modules.verification.application.RequestVerificationCodeService;
import co.edu.unipamplona.villadent.modules.verification.application.VerifyPhoneCodeService;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.ConsumeVerificationTokenUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.RequestVerificationCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationTokenRepository;
import co.edu.unipamplona.villadent.modules.verification.infrastructure.security.SecureVerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.infrastructure.whatsapp.WhatsAppVerificationSender;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class VerificationConfig {

    @Bean
    public VerificationSecrets verificationSecrets() {
        return new SecureVerificationSecrets();
    }

    @Bean
    public RequestVerificationCodeUseCase requestVerificationCodeUseCase(
            NormalizePhoneUseCase normalizePhone,
            VerificationCodeRepository codes,
            VerificationSender sender,
            VerificationSecrets secrets,
            Clock clock,
            @Value("${app.verification.max-codes-per-phone-per-hour:3}") int maxCodesPerPhonePerHour,
            @Value("${app.verification.max-codes-per-ip-per-hour:10}") int maxCodesPerIpPerHour) {
        return new RequestVerificationCodeService(
                normalizePhone,
                codes,
                sender,
                secrets,
                clock,
                maxCodesPerPhonePerHour,
                maxCodesPerIpPerHour);
    }

    @Bean
    public VerifyPhoneCodeUseCase verifyPhoneCodeUseCase(
            NormalizePhoneUseCase normalizePhone,
            VerificationCodeRepository codes,
            VerificationTokenRepository tokens,
            VerificationSecrets secrets,
            Clock clock) {
        return new VerifyPhoneCodeService(normalizePhone, codes, tokens, secrets, clock);
    }

    @Bean
    public ConsumeVerificationTokenUseCase consumeVerificationTokenUseCase(
            VerificationTokenRepository tokens,
            VerificationSecrets secrets,
            NormalizePhoneUseCase normalizePhone,
            Clock clock) {
        return new ConsumeVerificationTokenService(tokens, secrets, normalizePhone, clock);
    }

    @Bean
    @Profile("!e2e")
    public VerificationSender verificationSender(
            @Value("${app.whatsapp.api-url:https://graph.facebook.com/v21.0}") String apiUrl,
            @Value("${app.whatsapp.token:}") String token,
            @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${app.whatsapp.verification-template-name:}") String templateName) {
        return new WhatsAppVerificationSender(apiUrl, token, phoneNumberId, templateName);
    }
}
