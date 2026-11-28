package co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens;

public interface VerificationSecrets {

    /**
     * @return a six digit numeric code.
     */
    String newCode();

    /**
     * @return a 32 byte URL safe random token.
     */
    String newToken();

    /**
     * @return the SHA-256 hex digest of the value.
     */
    String hash(String value);
}
