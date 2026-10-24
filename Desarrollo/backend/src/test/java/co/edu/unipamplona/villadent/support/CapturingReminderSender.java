package co.edu.unipamplona.villadent.support;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class CapturingReminderSender implements ReminderSender {

    private final List<ReminderMessage> messages = new CopyOnWriteArrayList<>();
    private volatile RuntimeException failure;

    @Override
    public void send(ReminderMessage message) {
        if (failure != null) {
            throw failure;
        }
        messages.add(message);
    }

    public List<ReminderMessage> messages() {
        return List.copyOf(messages);
    }

    public void failWith(RuntimeException exception) {
        this.failure = exception;
    }

    public void succeed() {
        this.failure = null;
    }

    public void clear() {
        messages.clear();
        failure = null;
    }
}
