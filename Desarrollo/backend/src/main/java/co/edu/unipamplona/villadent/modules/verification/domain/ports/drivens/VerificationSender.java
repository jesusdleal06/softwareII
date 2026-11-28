package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens;

public interface VerificationSender {

    void sendVerificationCode(String phone, String code);
}
