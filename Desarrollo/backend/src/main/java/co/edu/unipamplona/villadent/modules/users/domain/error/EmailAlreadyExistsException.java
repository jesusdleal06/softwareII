package co.edu.unipamplona.villadent.modules.users.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class EmailAlreadyExistsException extends DomainException {

    public EmailAlreadyExistsException() {
        super("EMAIL_ALREADY_EXISTS", "Ya existe un usuario con ese correo.", 409);
    }
}
