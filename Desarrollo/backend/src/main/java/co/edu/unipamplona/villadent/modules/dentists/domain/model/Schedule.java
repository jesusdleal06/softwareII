package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidScheduleException;
import java.time.LocalTime;

public final class Schedule {

    private final Long id;
    private final Long dentistId;
    private final int dayOfWeek;
    private final LocalTime start;
    private final LocalTime end;
    private final boolean active;

    public Schedule(Long id, Long dentistId, int dayOfWeek, LocalTime start, LocalTime end, boolean active) {
        if (dentistId == null) {
            throw new InvalidScheduleException("El odontólogo del horario es obligatorio.");
        }
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new InvalidScheduleException("El día de la semana debe estar entre 1 y 7.");
        }
        if (start == null || end == null) {
            throw new InvalidScheduleException("La hora de inicio y la hora de fin son obligatorias.");
        }
        if (!end.isAfter(start)) {
            throw new InvalidScheduleException("La hora de fin debe ser posterior a la hora de inicio.");
        }
        this.id = id;
        this.dentistId = dentistId;
        this.dayOfWeek = dayOfWeek;
        this.start = start;
        this.end = end;
        this.active = active;
    }

    public static Schedule create(Long dentistId, int dayOfWeek, LocalTime start, LocalTime end) {
        return new Schedule(null, dentistId, dayOfWeek, start, end, true);
    }

    public Schedule changeActive(boolean active) {
        return new Schedule(id, dentistId, dayOfWeek, start, end, active);
    }

    public Long id() {
        return id;
    }

    public Long dentistId() {
        return dentistId;
    }

    public int dayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime start() {
        return start;
    }

    public LocalTime end() {
        return end;
    }

    public boolean isActive() {
        return active;
    }
}
