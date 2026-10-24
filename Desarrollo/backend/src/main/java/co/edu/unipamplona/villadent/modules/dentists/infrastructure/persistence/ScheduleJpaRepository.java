package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleJpaRepository extends JpaRepository<ScheduleJpaEntity, Long> {

    List<ScheduleJpaEntity> findByDentistIdOrderByDayOfWeekAscStartAsc(Long dentistId);
}
