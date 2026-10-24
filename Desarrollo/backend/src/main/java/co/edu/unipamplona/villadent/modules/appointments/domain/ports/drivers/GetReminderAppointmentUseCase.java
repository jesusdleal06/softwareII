package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.util.Optional;

public interface GetReminderAppointmentUseCase {

    Optional<ReminderAppointment> find(Long appointmentId);
}
