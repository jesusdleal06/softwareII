package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListSchedulesUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListSchedulesService implements ListSchedulesUseCase {

    private final DentistRepository dentists;
    private final ScheduleRepository schedules;

    public ListSchedulesService(DentistRepository dentists, ScheduleRepository schedules) {
        this.dentists = dentists;
        this.schedules = schedules;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScheduleResult> listByDentist(Long dentistId) {
        dentists.findById(dentistId)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        return schedules.findByDentistId(dentistId).stream()
                .map(AddScheduleService::toResult)
                .toList();
    }
}
