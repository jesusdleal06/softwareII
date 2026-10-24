package co.edu.unipamplona.villadent.modules.reminders.infrastructure.scheduling;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.SendDueRemindersUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.reminders.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final SendDueRemindersUseCase sendDueReminders;

    public ReminderScheduler(SendDueRemindersUseCase sendDueReminders) {
        this.sendDueReminders = sendDueReminders;
    }

    @Scheduled(fixedDelayString = "${app.reminders.poll-interval-ms:60000}")
    public void poll() {
        try {
            int sent = sendDueReminders.sendDue();
            if (sent > 0) {
                log.info("Processed {} due reminders", sent);
            }
        } catch (RuntimeException exception) {
            log.warn("Reminder polling failed", exception);
        }
    }
}
