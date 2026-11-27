package co.edu.unipamplona.villadent.modules.appointments.domain.error;

import co.edu.unipamplona.villadent.shared.error.ConflictException;

public class DentistDoesNotPerformProcedureException extends ConflictException {

    public DentistDoesNotPerformProcedureException() {
        super(
                "DENTIST_DOES_NOT_PERFORM_PROCEDURE",
                "El odontólogo no realiza este procedimiento.");
    }
}
