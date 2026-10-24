package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers;

public interface CancelReminderUseCase {

    void cancel(Long appointmentId);
}
