package co.edu.unipamplona.villadent.modules.appointments.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class AppointmentNotManageableException extends DomainException {

    public static final String MESSAGE = "Esta cita ya no admite cambios.";

    public AppointmentNotManageableException() {
        super("APPOINTMENT_NOT_MANAGEABLE", MESSAGE, 409);
    }
}
