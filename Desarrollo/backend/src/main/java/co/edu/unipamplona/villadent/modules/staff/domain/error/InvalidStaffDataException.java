package co.edu.unipamplona.villadent.modules.staff.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidStaffDataException extends DomainException {

    public InvalidStaffDataException(String detail) {
        super("INVALID_STAFF_DATA", detail, 400);
    }
}
