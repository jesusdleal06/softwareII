package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers;

public interface RequestVerificationCodeUseCase {

    void request(RequestCodeCommand command);

    record RequestCodeCommand(String phone, String clientIp) {
    }
}
