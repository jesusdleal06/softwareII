package co.edu.unipamplona.villadent.modules.dentists.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidScheduleException extends DomainException {

    public InvalidScheduleException(String detail) {
        super("INVALID_SCHEDULE", detail, 400);
    }
}
