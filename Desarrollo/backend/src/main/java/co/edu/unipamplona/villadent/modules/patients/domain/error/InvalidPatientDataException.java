package co.edu.unipamplona.villadent.modules.patients.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidPatientDataException extends DomainException {

    public InvalidPatientDataException(String detail) {
        super("INVALID_PATIENT_DATA", detail, 400);
    }
}
