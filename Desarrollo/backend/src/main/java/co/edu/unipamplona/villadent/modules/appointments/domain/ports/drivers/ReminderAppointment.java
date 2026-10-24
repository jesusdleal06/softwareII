package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.time.LocalTime;

/** What the reminder module needs to know about an appointment. */
public record ReminderAppointment(
        Long id,
        String code,
        String patientName,
        String patientPhone,
        String dentistName,
        String procedureName,
        LocalDate date,
        LocalTime time,
        boolean active,
        boolean future,
        String tokenHash) {
}
