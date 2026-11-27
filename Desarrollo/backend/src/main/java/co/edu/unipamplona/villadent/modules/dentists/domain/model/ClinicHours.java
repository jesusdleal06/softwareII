package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import co.edu.unipamplona.villadent.modules.dentists.domain.error.InvalidScheduleException;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * The clinic working hours (S1): Monday to Friday 08:00-12:00 and 14:00-18:00, Sunday
 * 08:00-13:00, Saturday closed. They live here, in the domain, and not only in the data:
 * availability is driven by the dentist schedules, so a schedule outside these windows
 * would silently open hours the clinic does not work.
 *
 * <p>A bookable schedule has to fit completely inside one of the windows of its day.
 */
public final class ClinicHours {

    public static final String SATURDAY_CLOSED = "La clínica no atiende los sábados.";
    public static final String OUTSIDE_HOURS =
            "El horario debe quedar dentro de la jornada de la clínica: "
                    + "lunes a viernes 08:00-12:00 y 14:00-18:00, domingo 08:00-13:00.";

    private static final List<Window> WEEKDAY_WINDOWS = List.of(
            new Window(LocalTime.of(8, 0), LocalTime.of(12, 0)),
            new Window(LocalTime.of(14, 0), LocalTime.of(18, 0)));
    private static final List<Window> SUNDAY_WINDOWS =
            List.of(new Window(LocalTime.of(8, 0), LocalTime.of(13, 0)));

    private ClinicHours() {
    }

    /**
     * Rejects a schedule that leaves the clinic working day. Only the bookable (active)
     * schedules have to obey the rule: an inactive one is history and nothing is ever
     * deleted, so the Saturday rows a database already holds can still be read back.
     */
    static void validate(int dayOfWeek, LocalTime start, LocalTime end, boolean active) {
        if (!active) {
            return;
        }
        if (dayOfWeek == DayOfWeek.SATURDAY.getValue()) {
            throw new InvalidScheduleException(SATURDAY_CLOSED);
        }
        boolean inside = windowsOf(dayOfWeek).stream().anyMatch(window -> window.contains(start, end));
        if (!inside) {
            throw new InvalidScheduleException(OUTSIDE_HOURS);
        }
    }

    private static List<Window> windowsOf(int dayOfWeek) {
        if (dayOfWeek == DayOfWeek.SUNDAY.getValue()) {
            return SUNDAY_WINDOWS;
        }
        return WEEKDAY_WINDOWS;
    }

    /** A working window of the clinic: the schedule has to fit inside it, from start to end. */
    private record Window(LocalTime start, LocalTime end) {

        boolean contains(LocalTime otherStart, LocalTime otherEnd) {
            return !otherStart.isBefore(start) && !otherEnd.isAfter(end);
        }
    }
}
