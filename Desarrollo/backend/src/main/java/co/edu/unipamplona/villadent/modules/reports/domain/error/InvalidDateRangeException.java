package co.edu.unipamplona.villadent.modules.reports.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidDateRangeException extends DomainException {

    public static final String MESSAGE = "La fecha final debe ser igual o posterior a la inicial.";

    public InvalidDateRangeException() {
        super("INVALID_DATE_RANGE", MESSAGE, 400);
    }
}
