package co.edu.unipamplona.villadent.modules.reminders.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import co.edu.unipamplona.villadent.shared.clock.ClockConfig;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ReminderPersistenceAdapter implements ReminderRepository {

    private final ReminderJpaRepository reminders;
    private final ReminderPersistenceMapper mapper;

    public ReminderPersistenceAdapter(
            ReminderJpaRepository reminders,
            ReminderPersistenceMapper mapper) {
        this.reminders = reminders;
        this.mapper = mapper;
    }

    @Override
    public Optional<Reminder> findById(Long id) {
        return reminders.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Reminder> findProgrammedByAppointmentId(Long appointmentId) {
        return reminders.findFirstByAppointmentIdAndStatusOrderByIdDesc(
                        appointmentId, ReminderStatus.PROGRAMADO)
                .map(mapper::toDomain);
    }

    @Override
    public Optional<Reminder> findLatestByAppointmentId(Long appointmentId) {
        return reminders.findFirstByAppointmentIdOrderByIdDesc(appointmentId).map(mapper::toDomain);
    }

    @Override
    public List<Reminder> findDue(LocalDateTime now) {
        return reminders.findByStatusAndScheduledForLessThanEqualOrderByScheduledForAsc(
                        ReminderStatus.PROGRAMADO, now.atZone(ClockConfig.ZONE).toInstant())
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Reminder save(Reminder reminder) {
        ReminderJpaEntity entity = reminder.id() == null
                ? new ReminderJpaEntity()
                : reminders.findById(reminder.id()).orElseGet(ReminderJpaEntity::new);
        mapper.updateEntity(reminder, entity);
        return mapper.toDomain(reminders.save(entity));
    }
}
