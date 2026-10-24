package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import java.time.LocalTime;

/** A dentist schedule block, independent of the module that owns schedules. */
public record TimeWindow(LocalTime start, LocalTime end) {

    public TimeWindow {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new IllegalArgumentException("A time window needs a start before its end.");
        }
    }
}
