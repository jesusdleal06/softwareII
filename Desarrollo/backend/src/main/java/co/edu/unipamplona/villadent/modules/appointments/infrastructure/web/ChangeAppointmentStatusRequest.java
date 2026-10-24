package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAppointmentStatusRequest(
        @NotNull(message = "El estado es obligatorio.") AppointmentStatus status) {
}
