package co.edu.unipamplona.villadent.modules.appointments.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAgendaUseCase;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivens.AppointmentRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class GetAgendaService implements GetAgendaUseCase {

    private final AppointmentRepository appointments;
    private final AppointmentResultAssembler assembler;

    public GetAgendaService(AppointmentRepository appointments, AppointmentResultAssembler assembler) {
        this.appointments = appointments;
        this.assembler = assembler;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResult> agenda(LocalDate date, Long dentistId) {
        return (dentistId == null
                        ? appointments.findByDate(date)
                        : appointments.findByDentistIdAndDate(dentistId, date))
                .stream()
                .map(assembler::assemble)
                .toList();
    }
}
