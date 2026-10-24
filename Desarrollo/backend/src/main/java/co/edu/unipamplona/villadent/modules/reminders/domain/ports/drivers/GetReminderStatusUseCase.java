package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers;

import java.util.Optional;

public interface GetReminderStatusUseCase {

    Optional<ReminderStatusResult> statusFor(Long appointmentId);
}
