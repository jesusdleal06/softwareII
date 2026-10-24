package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.util.List;

/** Appointment data exposed to other modules without leaking repositories or JPA entities. */
public interface GetAppointmentReportUseCase {

    List<AppointmentReportRow> between(LocalDate from, LocalDate to, Long dentistId);
}
