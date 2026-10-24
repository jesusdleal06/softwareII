package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class AvailabilityCalculatorTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final LocalDateTime FRIDAY_MORNING = LocalDateTime.of(2026, 10, 23, 7, 0);
    private static final TimeWindow MORNING = new TimeWindow(LocalTime.of(8, 0), LocalTime.of(12, 0));

    private Appointment appointmentAt(LocalTime time, int duration, AppointmentStatus status) {
        return new Appointment(
                null,
                "VD-0001",
                1L,
                1L,
                1L,
                MONDAY,
                time,
                duration,
                status,
                AppointmentOrigin.WEB,
                "hash");
    }

    @Test
    void offersA30MinuteGridThatFitsTheWholeProcedure() {
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                MONDAY, FRIDAY_MORNING, 45, List.of(MORNING), List.of());

        assertThat(slots).startsWith(LocalTime.of(8, 0));
        assertThat(slots).contains(LocalTime.of(11, 0));
        assertThat(slots).doesNotContain(LocalTime.of(11, 30));
    }

    @Test
    void hidesAnOccupiedSlot() {
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                MONDAY,
                FRIDAY_MORNING,
                30,
                List.of(MORNING),
                List.of(appointmentAt(LocalTime.of(10, 0), 30, AppointmentStatus.CONFIRMADA)));

        assertThat(slots).doesNotContain(LocalTime.of(10, 0));
        assertThat(slots).contains(LocalTime.of(10, 30));
    }

    @Test
    void freesTheSlotOfACancelledAppointment() {
        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                MONDAY,
                FRIDAY_MORNING,
                30,
                List.of(MORNING),
                List.of(appointmentAt(LocalTime.of(10, 0), 30, AppointmentStatus.CANCELADA)));

        assertThat(slots).contains(LocalTime.of(10, 0));
    }

    @Test
    void skipsAlreadyStartedTimesToday() {
        LocalDateTime mondayAtTen = LocalDateTime.of(MONDAY, LocalTime.of(10, 0));

        List<LocalTime> slots = AvailabilityCalculator.availableSlots(
                MONDAY, mondayAtTen, 30, List.of(MORNING), List.of());

        assertThat(slots).doesNotContain(LocalTime.of(9, 30));
        assertThat(slots).contains(LocalTime.of(10, 30));
    }

    @Test
    void offersNothingForAPastDateOrADayWithoutSchedule() {
        assertThat(AvailabilityCalculator.availableSlots(
                LocalDate.of(2026, 10, 22),
                FRIDAY_MORNING,
                30,
                List.of(MORNING),
                List.of())).isEmpty();
        assertThat(AvailabilityCalculator.availableSlots(
                MONDAY, FRIDAY_MORNING, 30, List.of(), List.of())).isEmpty();
    }
}
