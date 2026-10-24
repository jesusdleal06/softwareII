package co.edu.unipamplona.villadent.modules.reminders.infrastructure.scheduling;

import static org.assertj.core.api.Assertions.assertThatCode;

import co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers.SendDueRemindersUseCase;
import org.junit.jupiter.api.Test;

class ReminderSchedulerTest {

    @Test
    void pollReportsProcessedRemindersAndSwallowsFailures() {
        ReminderScheduler withWork = new ReminderScheduler(() -> 2);
        ReminderScheduler withoutWork = new ReminderScheduler(() -> 0);
        ReminderScheduler failing = new ReminderScheduler(new SendDueRemindersUseCase() {
            @Override
            public int sendDue() {
                throw new IllegalStateException("boom");
            }
        });

        assertThatCode(withWork::poll).doesNotThrowAnyException();
        assertThatCode(withoutWork::poll).doesNotThrowAnyException();
        assertThatCode(failing::poll).doesNotThrowAnyException();
    }
}
