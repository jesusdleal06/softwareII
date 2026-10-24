package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.ScheduleRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class SchedulePersistenceAdapter implements ScheduleRepository {

    private final ScheduleJpaRepository schedules;
    private final SchedulePersistenceMapper mapper;

    public SchedulePersistenceAdapter(
            ScheduleJpaRepository schedules,
            SchedulePersistenceMapper mapper) {
        this.schedules = schedules;
        this.mapper = mapper;
    }

    @Override
    public Optional<Schedule> findById(Long id) {
        return schedules.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<Schedule> findByDentistId(Long dentistId) {
        return schedules.findByDentistIdOrderByDayOfWeekAscStartAsc(dentistId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Schedule save(Schedule schedule) {
        ScheduleJpaEntity entity = schedule.id() == null
                ? new ScheduleJpaEntity()
                : schedules.findById(schedule.id()).orElseGet(ScheduleJpaEntity::new);
        mapper.updateEntity(schedule, entity);
        return mapper.toDomain(schedules.save(entity));
    }
}
