package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import java.time.LocalDate;
import java.time.LocalTime;

public interface BookAppointmentUseCase {

    AppointmentResult book(BookAppointmentCommand command);

    record BookAppointmentCommand(
            String patientName,
            String patientPhone,
            Long dentistId,
            Long procedureId,
            LocalDate date,
            LocalTime time,
            AppointmentOrigin origin) {
    }
}
