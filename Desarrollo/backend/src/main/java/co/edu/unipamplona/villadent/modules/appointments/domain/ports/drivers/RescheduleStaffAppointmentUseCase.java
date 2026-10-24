package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.time.LocalTime;

public interface RescheduleStaffAppointmentUseCase {

    /**
     * Reschedules a staff appointment after checking the dentist's availability.
     *
     * @param dentistScope when not null, only an appointment of that dentist may change
     */
    AppointmentResult reschedule(Long appointmentId, LocalDate date, LocalTime time, Long dentistScope);
}
