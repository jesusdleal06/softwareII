package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.time.LocalTime;

public interface AddScheduleUseCase {

    ScheduleResult add(AddScheduleCommand command);

    record AddScheduleCommand(Long dentistId, int dayOfWeek, LocalTime start, LocalTime end) {
    }
}
