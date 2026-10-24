package co.edu.unipamplona.villadent.modules.procedures.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidProcedureDataException extends DomainException {

    public InvalidProcedureDataException(String detail) {
        super("INVALID_PROCEDURE_DATA", detail, 400);
    }
}
