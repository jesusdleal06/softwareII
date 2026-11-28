package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidCodeException extends DomainException {

    public static final String MESSAGE = "El código no es correcto.";

    public InvalidCodeException() {
        super("INVALID_CODE", MESSAGE, 400);
    }
}
