package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentResult(
        Long id,
        String code,
        Long patientId,
        String patientName,
        String patientPhone,
        Long dentistId,
        String dentistName,
        Long procedureId,
        String procedureName,
        LocalDate date,
        LocalTime time,
        int durationMinutes,
        AppointmentStatus status,
        AppointmentOrigin origin) {
}
