package co.edu.unipamplona.villadent.modules.reminders.domain.error;

public class ReminderDeliveryException extends RuntimeException {

    public ReminderDeliveryException(String message) {
        super(message);
    }

    public ReminderDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
