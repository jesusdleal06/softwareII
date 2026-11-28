package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class VerificationDeliveryException extends DomainException {

    public static final String MESSAGE = "No pudimos enviar el código. Intenta de nuevo en unos minutos.";

    public VerificationDeliveryException() {
        super("VERIFICATION_DELIVERY_FAILED", MESSAGE, 503);
    }

    public VerificationDeliveryException(Throwable cause) {
        super("VERIFICATION_DELIVERY_FAILED", MESSAGE, 503, cause);
    }
}
