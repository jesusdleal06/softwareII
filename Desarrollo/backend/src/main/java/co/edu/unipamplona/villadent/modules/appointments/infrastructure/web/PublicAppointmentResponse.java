package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalTime;

public record PublicAppointmentResponse(
        Long id,
        String code,
        Long dentistId,
        String dentistName,
        Long procedureId,
        String procedureName,
        LocalDate date,
        @JsonFormat(pattern = "HH:mm") LocalTime time,
        int durationMinutes,
        AppointmentStatus status) {
}
