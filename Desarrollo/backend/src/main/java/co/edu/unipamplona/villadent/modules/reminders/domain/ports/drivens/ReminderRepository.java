package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository {

    Optional<Reminder> findById(Long id);

    Optional<Reminder> findProgrammedByAppointmentId(Long appointmentId);

    Optional<Reminder> findLatestByAppointmentId(Long appointmentId);

    List<Reminder> findDue(LocalDateTime now);

    Reminder save(Reminder reminder);
}
