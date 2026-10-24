package co.edu.unipamplona.villadent.modules.dentists.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidDentistDataException extends DomainException {

    public InvalidDentistDataException(String detail) {
        super("INVALID_DENTIST_DATA", detail, 400);
    }
}
