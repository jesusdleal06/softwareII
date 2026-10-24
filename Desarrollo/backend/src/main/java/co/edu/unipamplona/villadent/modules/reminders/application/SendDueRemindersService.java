package co.edu.unipamplona.villadent.modules.reminders.application;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.SendDueRemindersUseCase;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderRepository;
import java.time.Clock;
import java.time.LocalDateTime;

public class SendDueRemindersService implements SendDueRemindersUseCase {

    private final ReminderRepository reminders;
    private final ReminderDeliveryService delivery;
    private final Clock clock;

    public SendDueRemindersService(
            ReminderRepository reminders,
            ReminderDeliveryService delivery,
            Clock clock) {
        this.reminders = reminders;
        this.delivery = delivery;
        this.clock = clock;
    }

    @Override
    public int sendDue() {
        var due = reminders.findDue(LocalDateTime.now(clock));
        due.forEach(reminder -> delivery.deliver(reminder.id()));
        return due.size();
    }
}
