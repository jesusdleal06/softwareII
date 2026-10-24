package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.ManagedAppointmentResult;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalTime;

public record ManagedAppointmentResponse(
        Long id,
        String code,
        Long dentistId,
        Long procedureId,
        String patientName,
        String patientPhone,
        String dentistName,
        String procedureName,
        LocalDate date,
        @JsonFormat(pattern = "HH:mm") LocalTime time,
        int durationMinutes,
        String status) {

    public static ManagedAppointmentResponse from(ManagedAppointmentResult result) {
        return new ManagedAppointmentResponse(
                result.id(),
                result.code(),
                result.dentistId(),
                result.procedureId(),
                result.patientName(),
                result.patientPhone(),
                result.dentistName(),
                result.procedureName(),
                result.date(),
                result.time(),
                result.durationMinutes(),
                result.status());
    }
}
