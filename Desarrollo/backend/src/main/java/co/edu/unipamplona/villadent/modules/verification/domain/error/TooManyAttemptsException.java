package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class TooManyAttemptsException extends DomainException {

    public static final String MESSAGE = "Superaste los intentos permitidos. Solicita un código nuevo.";

    public TooManyAttemptsException() {
        super("TOO_MANY_ATTEMPTS", MESSAGE, 400);
    }
}
