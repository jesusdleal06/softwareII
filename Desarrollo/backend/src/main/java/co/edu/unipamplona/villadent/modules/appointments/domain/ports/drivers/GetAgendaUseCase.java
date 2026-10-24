package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.util.List;

public interface GetAgendaUseCase {

    List<AppointmentResult> agenda(LocalDate date, Long dentistId);
}
