package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {

    Optional<Schedule> findById(Long id);

    List<Schedule> findByDentistId(Long dentistId);

    Schedule save(Schedule schedule);
}
