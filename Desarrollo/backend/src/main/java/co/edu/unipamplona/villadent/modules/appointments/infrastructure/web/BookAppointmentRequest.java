package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookAppointmentRequest(
        @NotBlank(message = "El nombre completo es obligatorio.") String patientName,
        @NotBlank(message = "El número de celular es obligatorio.") String patientPhone,
        @NotNull(message = "El odontólogo es obligatorio.") Long dentistId,
        @NotNull(message = "El procedimiento es obligatorio.") Long procedureId,
        @NotNull(message = "La fecha es obligatoria.") LocalDate date,
        @NotNull(message = "La hora es obligatoria.") LocalTime time) {
}
