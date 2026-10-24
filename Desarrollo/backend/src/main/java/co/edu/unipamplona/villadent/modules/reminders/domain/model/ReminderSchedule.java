package co.edu.unipamplona.villadent.modules.reminders.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Reminder times decided for Villadent: morning the day before, afternoon the same day. */
public final class ReminderSchedule {

    public static final LocalTime MORNING_REMINDER = LocalTime.of(18, 0);
    public static final LocalTime AFTERNOON_REMINDER = LocalTime.of(8, 0);
    public static final LocalTime NOON = LocalTime.NOON;

    private ReminderSchedule() {
    }

    public static LocalDateTime forAppointment(LocalDate date, LocalTime time) {
        return time.isBefore(NOON)
                ? date.minusDays(1).atTime(MORNING_REMINDER)
                : date.atTime(AFTERNOON_REMINDER);
    }

    public static LocalDateTime dueAtOrNow(LocalDate date, LocalTime time, LocalDateTime now) {
        LocalDateTime scheduled = forAppointment(date, time);
        return scheduled.isAfter(now) ? scheduled : now;
    }
}
