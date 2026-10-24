package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.time.LocalTime;

public record ScheduleResult(
        Long id,
        Long dentistId,
        int dayOfWeek,
        LocalTime start,
        LocalTime end,
        boolean active) {
}
