package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import java.time.LocalDate;
import java.util.List;

/** Public response: only free slots, never patient or other appointment data. */
public record AvailabilityResponse(
        Long dentistId,
        LocalDate date,
        Long procedureId,
        List<String> slots) {
}
