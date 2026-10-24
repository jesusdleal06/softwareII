package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface SetScheduleActiveUseCase {

    ScheduleResult setActive(Long dentistId, Long scheduleId, boolean active);
}
