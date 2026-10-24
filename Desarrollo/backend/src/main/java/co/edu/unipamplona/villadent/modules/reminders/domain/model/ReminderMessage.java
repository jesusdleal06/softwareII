package co.edu.unipamplona.villadent.modules.reminders.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;

public record ReminderMessage(
        String patientName,
        String phone,
        LocalDate date,
        LocalTime time,
        String dentistName,
        String procedureName,
        String manageUrl) {
}
