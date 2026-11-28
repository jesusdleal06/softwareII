package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class TooManyCodeRequestsException extends DomainException {

    public static final String MESSAGE = "Has solicitado demasiados códigos. Intenta de nuevo más tarde.";

    public TooManyCodeRequestsException() {
        super("TOO_MANY_CODE_REQUESTS", MESSAGE, 429);
    }
}
