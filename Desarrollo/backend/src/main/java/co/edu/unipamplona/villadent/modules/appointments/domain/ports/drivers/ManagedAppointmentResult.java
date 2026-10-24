package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import java.time.LocalDate;
import java.time.LocalTime;

public record ManagedAppointmentResult(
        Long id,
        String code,
        Long dentistId,
        Long procedureId,
        String patientName,
        String patientPhone,
        String dentistName,
        String procedureName,
        LocalDate date,
        LocalTime time,
        int durationMinutes,
        String status) {
}
