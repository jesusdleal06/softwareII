package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record RescheduleAppointmentRequest(
        @NotNull LocalDate date,
        @NotNull LocalTime time) {
}
