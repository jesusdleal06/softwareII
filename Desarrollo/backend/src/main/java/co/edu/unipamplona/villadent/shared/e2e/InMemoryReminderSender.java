package co.edu.unipamplona.villadent.shared.e2e;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.ReminderMessage;
import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivens.ReminderSender;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("e2e")
public class InMemoryReminderSender implements ReminderSender {

    private final ConcurrentLinkedQueue<ReminderMessage> messages = new ConcurrentLinkedQueue<>();

    @Override
    public void send(ReminderMessage message) {
        messages.add(message);
    }

    public List<ReminderMessage> messages() {
        return List.copyOf(messages);
    }
}
