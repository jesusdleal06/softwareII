package co.edu.unipamplona.villadent.modules.reminders.domain.ports.drivers;

public record ReminderStatusResult(String status, int attempts, String lastError) {
}
