package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import java.time.LocalTime;

public record ScheduleResponse(
        Long id,
        Long dentistId,
        int dayOfWeek,
        LocalTime start,
        LocalTime end,
        boolean active) {
}
