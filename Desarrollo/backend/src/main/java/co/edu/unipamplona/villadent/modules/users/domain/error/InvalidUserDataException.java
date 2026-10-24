package co.edu.unipamplona.villadent.modules.users.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidUserDataException extends DomainException {

    public InvalidUserDataException(String detail) {
        super("INVALID_USER_DATA", detail, 400);
    }
}
