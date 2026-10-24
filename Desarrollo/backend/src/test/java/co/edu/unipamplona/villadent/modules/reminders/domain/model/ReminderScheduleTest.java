package co.edu.unipamplona.villadent.modules.reminders.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReminderScheduleTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 26);

    @Test
    @DisplayName("CP-RF05-01: a morning appointment is reminded the day before at 18:00")
    void morningAppointmentIsRemindedTheDayBefore() {
        assertThat(ReminderSchedule.forAppointment(DAY, LocalTime.of(9, 0)))
                .isEqualTo(LocalDateTime.of(2026, 10, 25, 18, 0));
    }

    @Test
    @DisplayName("CP-RF05-02: an afternoon appointment is reminded the same day at 08:00")
    void afternoonAppointmentIsRemindedTheSameDay() {
        assertThat(ReminderSchedule.forAppointment(DAY, LocalTime.of(15, 0)))
                .isEqualTo(LocalDateTime.of(2026, 10, 26, 8, 0));
    }

    @Test
    @DisplayName("CP-RF05-05: 11:30 belongs to the morning and 14:00 to the afternoon")
    void classifiesTheBoundaryBetweenShifts() {
        assertThat(ReminderSchedule.forAppointment(DAY, LocalTime.of(11, 30)))
                .isEqualTo(LocalDateTime.of(2026, 10, 25, 18, 0));
        assertThat(ReminderSchedule.forAppointment(DAY, LocalTime.of(14, 0)))
                .isEqualTo(LocalDateTime.of(2026, 10, 26, 8, 0));
    }

    @Test
    @DisplayName("CP-RF05-06: a reminder time already passed is due at booking time")
    void dueAtBookingWhenTheReminderTimePassed() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 25, 20, 0);

        assertThat(ReminderSchedule.dueAtOrNow(DAY, LocalTime.of(9, 0), now)).isEqualTo(now);
    }

    @Test
    void keepsAFutureReminderTime() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 24, 10, 0);

        assertThat(ReminderSchedule.dueAtOrNow(DAY, LocalTime.of(9, 0), now))
                .isEqualTo(LocalDateTime.of(2026, 10, 25, 18, 0));
    }

    @Test
    @DisplayName("CP-RF05-04: the third failure leaves the reminder failed")
    void threeFailuresLeaveTheReminderFailed() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 25, 18, 0);
        Reminder reminder = Reminder.scheduled(1L, now);

        reminder = reminder.failed("boom", now, 3);
        assertThat(reminder.status()).isEqualTo(ReminderStatus.PROGRAMADO);
        assertThat(reminder.attempts()).isEqualTo(1);
        assertThat(reminder.scheduledFor()).isEqualTo(now.plusMinutes(5));

        reminder = reminder.failed("boom", now.plusMinutes(5), 3);
        assertThat(reminder.status()).isEqualTo(ReminderStatus.PROGRAMADO);

        reminder = reminder.failed("boom", now.plusMinutes(10), 3);
        assertThat(reminder.status()).isEqualTo(ReminderStatus.FALLIDO);
        assertThat(reminder.attempts()).isEqualTo(3);
    }

    @Test
    @DisplayName("CP-RF05-03: a cancelled appointment reminder is cancelled")
    void cancelledAppointmentReminderIsCancelled() {
        Reminder reminder = Reminder.scheduled(1L, LocalDateTime.of(2026, 10, 25, 18, 0));

        assertThat(reminder.cancelled().status()).isEqualTo(ReminderStatus.CANCELADO);
    }
}
