package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers;

public interface VerifyPhoneCodeUseCase {

    VerificationResult verify(VerifyCodeCommand command);

    record VerifyCodeCommand(String phone, String code) {
    }

    record VerificationResult(String verificationToken) {
    }
}
