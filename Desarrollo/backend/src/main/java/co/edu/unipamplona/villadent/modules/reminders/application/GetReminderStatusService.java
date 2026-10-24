package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.GetReminderStatusUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.ReminderStatusResult;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import java.util.Optional;

public class GetReminderStatusService implements GetReminderStatusUseCase {

    private final ReminderRepository reminders;

    public GetReminderStatusService(ReminderRepository reminders) {
        this.reminders = reminders;
    }

    @Override
    public Optional<ReminderStatusResult> statusFor(Long appointmentId) {
        return reminders.findLatestByAppointmentId(appointmentId)
                .map(reminder -> new ReminderStatusResult(
                        reminder.status().name(),
                        reminder.attempts(),
                        reminder.lastError()));
    }
}
