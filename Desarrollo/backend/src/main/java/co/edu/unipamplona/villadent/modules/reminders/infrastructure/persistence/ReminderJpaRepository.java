package co.edu.unipamplona.villadent.modules.reminders.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReminderJpaRepository extends JpaRepository<ReminderJpaEntity, Long> {

    Optional<ReminderJpaEntity> findFirstByAppointmentIdAndStatusOrderByIdDesc(
            Long appointmentId, ReminderStatus status);

    Optional<ReminderJpaEntity> findFirstByAppointmentIdOrderByIdDesc(Long appointmentId);

    List<ReminderJpaEntity> findByStatusAndScheduledForLessThanEqualOrderByScheduledForAsc(
            ReminderStatus status, Instant now);
}
