package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.AddScheduleUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ScheduleResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class AddScheduleService implements AddScheduleUseCase {

    private final DentistRepository dentists;
    private final ScheduleRepository schedules;

    public AddScheduleService(DentistRepository dentists, ScheduleRepository schedules) {
        this.dentists = dentists;
        this.schedules = schedules;
    }

    @Override
    @Transactional
    public ScheduleResult add(AddScheduleCommand command) {
        dentists.findById(command.dentistId())
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        Schedule schedule = Schedule.create(
                command.dentistId(), command.dayOfWeek(), command.start(), command.end());
        return toResult(schedules.save(schedule));
    }

    static ScheduleResult toResult(Schedule schedule) {
        return new ScheduleResult(
                schedule.id(),
                schedule.dentistId(),
                schedule.dayOfWeek(),
                schedule.start(),
                schedule.end(),
                schedule.isActive());
    }
}
