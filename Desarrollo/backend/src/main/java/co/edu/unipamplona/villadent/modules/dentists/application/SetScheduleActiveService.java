package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetScheduleActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class SetScheduleActiveService implements SetScheduleActiveUseCase {

    private final ScheduleRepository schedules;

    public SetScheduleActiveService(ScheduleRepository schedules) {
        this.schedules = schedules;
    }

    @Override
    @Transactional
    public ScheduleResult setActive(Long dentistId, Long scheduleId, boolean active) {
        Schedule schedule = schedules.findById(scheduleId)
                .filter(candidate -> candidate.dentistId().equals(dentistId))
                .orElseThrow(() -> new NotFoundException("No se encontró el horario."));
        return AddScheduleService.toResult(schedules.save(schedule.changeActive(active)));
    }
}
