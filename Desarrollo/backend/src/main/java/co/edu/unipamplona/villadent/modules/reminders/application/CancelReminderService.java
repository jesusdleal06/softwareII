package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.CancelReminderUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import org.springframework.transaction.annotation.Transactional;

public class CancelReminderService implements CancelReminderUseCase {

    private final ReminderRepository reminders;

    public CancelReminderService(ReminderRepository reminders) {
        this.reminders = reminders;
    }

    @Override
    @Transactional
    public void cancel(Long appointmentId) {
        reminders.findProgrammedByAppointmentId(appointmentId)
                .ifPresent(reminder -> reminders.save(reminder.cancelled()));
    }
}
