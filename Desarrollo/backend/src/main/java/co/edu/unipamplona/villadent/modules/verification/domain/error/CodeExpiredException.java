package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class CodeExpiredException extends DomainException {

    public static final String MESSAGE = "El código venció. Solicita uno nuevo.";

    public CodeExpiredException() {
        super("CODE_EXPIRED", MESSAGE, 400);
    }
}
