package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * The 30-minute grid of the prototype: a slot is offered only when the whole
 * procedure fits inside a schedule block, the slot is not in the past and it
 * does not overlap an occupying appointment of the same dentist.
 */
public final class AvailabilityCalculator {

    public static final int SLOT_INTERVAL_MINUTES = 30;

    private AvailabilityCalculator() {
    }

    public static List<LocalTime> availableSlots(
            LocalDate date,
            LocalDateTime now,
            int durationMinutes,
            List<TimeWindow> windows,
            List<Appointment> appointments) {
        if (durationMinutes <= 0) {
            throw new IllegalArgumentException("The procedure duration must be positive.");
        }
        if (date.isBefore(now.toLocalDate())) {
            return List.of();
        }
        Set<LocalTime> slots = new TreeSet<>();
        for (TimeWindow window : windows) {
            for (LocalTime start = window.start();
                    !start.plusMinutes(durationMinutes).isAfter(window.end());
                    start = start.plusMinutes(SLOT_INTERVAL_MINUTES)) {
                if (date.equals(now.toLocalDate()) && !start.isAfter(now.toLocalTime())) {
                    continue;
                }
                LocalTime slotStart = start;
                boolean busy = appointments.stream()
                        .anyMatch(appointment -> appointment.overlaps(date, slotStart, durationMinutes));
                if (!busy) {
                    slots.add(start);
                }
            }
        }
        return List.copyOf(slots);
    }
}
