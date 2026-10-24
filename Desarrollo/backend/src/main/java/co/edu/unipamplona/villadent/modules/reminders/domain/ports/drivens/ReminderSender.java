package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;

public interface ReminderSender {

    void send(ReminderMessage message);
}
