package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers;

public interface ConsumeVerificationTokenUseCase {

    /**
     * Consumes a verification token for the given phone. A token can be used once.
     */
    void consume(String rawToken, String phone);
}
