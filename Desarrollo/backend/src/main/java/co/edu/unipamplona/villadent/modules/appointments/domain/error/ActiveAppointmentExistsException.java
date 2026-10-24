package co.edu.unipamplona.villadent.modules.appointments.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class ActiveAppointmentExistsException extends DomainException {

    public static final String MESSAGE =
            "El paciente ya tiene una cita activa. Reprograma o cancela esa cita antes de crear una nueva.";

    public ActiveAppointmentExistsException() {
        super("ACTIVE_APPOINTMENT_EXISTS", MESSAGE, 409);
    }
}
