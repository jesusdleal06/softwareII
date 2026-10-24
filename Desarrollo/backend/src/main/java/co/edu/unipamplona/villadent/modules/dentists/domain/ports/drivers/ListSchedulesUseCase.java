package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.util.List;

public interface ListSchedulesUseCase {

    List<ScheduleResult> listByDentist(Long dentistId);
}
