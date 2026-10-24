package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;

public interface ChangeAppointmentStatusUseCase {

    /**
     * Changes a staff appointment status.
     *
     * @param dentistScope when not null, only an appointment of that dentist may change
     */
    AppointmentResult changeStatus(Long appointmentId, AppointmentStatus status, Long dentistScope);
}
