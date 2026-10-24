package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.AppointmentNotManageableException;
import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AppointmentTest {

    private static final LocalDate DATE = LocalDate.of(2026, 10, 26);

    private Appointment appointmentAt(LocalTime time, int durationMinutes) {
        return new Appointment(
                null,
                "VD-0001",
                1L,
                1L,
                1L,
                DATE,
                time,
                durationMinutes,
                AppointmentStatus.PENDIENTE,
                AppointmentOrigin.WEB,
                "hash");
    }

    @Test
    @DisplayName("CP-RF03-02: rejects an overlapping appointment")
    void rejectsAnOverlappingAppointment() {
        Appointment existing = appointmentAt(LocalTime.of(10, 0), 30);
        Appointment candidate = appointmentAt(LocalTime.of(10, 15), 30);

        assertThatThrownBy(() -> candidate.ensureNoOverlap(List.of(existing)))
                .isInstanceOf(SlotTakenException.class)
                .hasMessage(Appointment.PUBLIC_CONFLICT);
    }

    @Test
    @DisplayName("CP-RF08-03: a manual appointment reports the staff conflict message")
    void reportsTheStaffConflictMessage() {
        Appointment existing = appointmentAt(LocalTime.of(10, 0), 30);
        Appointment candidate = new Appointment(
                null,
                "VD-0003",
                1L,
                1L,
                1L,
                DATE,
                LocalTime.of(10, 15),
                30,
                AppointmentStatus.PENDIENTE,
                AppointmentOrigin.MANUAL,
                "hash");

        assertThatThrownBy(() -> candidate.ensureNoOverlap(List.of(existing)))
                .isInstanceOf(SlotTakenException.class)
                .hasMessage(Appointment.STAFF_CONFLICT);
    }

    @Test
    void acceptsAnAppointmentThatStartsWhenThePreviousOneEnds() {
        Appointment existing = appointmentAt(LocalTime.of(10, 0), 30);
        Appointment candidate = appointmentAt(LocalTime.of(10, 30), 30);

        assertThatCode(() -> candidate.ensureNoOverlap(List.of(existing)))
                .doesNotThrowAnyException();
    }

    @Test
    void confirmsAnActiveAppointment() {
        assertThat(appointmentAt(LocalTime.of(10, 0), 30).confirm().status())
                .isEqualTo(AppointmentStatus.CONFIRMADA);
    }

    @Test
    void rejectsConfirmingAnAppointmentThatNoLongerOccupiesItsSlot() {
        Appointment cancelled = new Appointment(
                null, "VD-0002", 1L, 1L, 1L, DATE, LocalTime.of(10, 0), 30,
                AppointmentStatus.CANCELADA, AppointmentOrigin.WEB, "hash");

        assertThatThrownBy(cancelled::confirm)
                .isInstanceOf(AppointmentNotManageableException.class)
                .hasMessage(AppointmentNotManageableException.MESSAGE);
    }

    @Test
    void reschedulesAnActiveAppointment() {
        Appointment rescheduled = appointmentAt(LocalTime.of(10, 0), 30)
                .reschedule(DATE.plusDays(1), LocalTime.of(11, 0));

        assertThat(rescheduled.date()).isEqualTo(DATE.plusDays(1));
        assertThat(rescheduled.time()).isEqualTo(LocalTime.of(11, 0));
        assertThat(rescheduled.status()).isEqualTo(AppointmentStatus.REPROGRAMADA);
    }

    @Test
    void rejectsReschedulingAnAppointmentThatNoLongerOccupiesItsSlot() {
        Appointment cancelled = new Appointment(
                null, "VD-0002", 1L, 1L, 1L, DATE, LocalTime.of(10, 0), 30,
                AppointmentStatus.CANCELADA, AppointmentOrigin.WEB, "hash");

        assertThatThrownBy(() -> cancelled.reschedule(DATE, LocalTime.of(11, 0)))
                .isInstanceOf(AppointmentNotManageableException.class);
    }

    @Test
    void replacesTheManageTokenAndKeepsTheRest() {
        Appointment tokenized = appointmentAt(LocalTime.of(10, 0), 30).withTokenHash("new-hash");

        assertThat(tokenized.tokenHash()).isEqualTo("new-hash");
        assertThat(tokenized.code()).isEqualTo("VD-0001");
    }

    @Test
    void onlyFutureActiveAppointmentsCanBeManaged() {
        Appointment active = appointmentAt(LocalTime.of(10, 0), 30);
        Appointment cancelled = new Appointment(
                null, "VD-0002", 1L, 1L, 1L, DATE, LocalTime.of(10, 0), 30,
                AppointmentStatus.CANCELADA, AppointmentOrigin.WEB, "hash");

        assertThat(active.canBeManaged(LocalDateTime.of(2026, 10, 26, 9, 0))).isTrue();
        assertThat(active.canBeManaged(LocalDateTime.of(2026, 10, 26, 10, 0))).isFalse();
        assertThat(cancelled.canBeManaged(LocalDateTime.of(2026, 10, 26, 9, 0))).isFalse();
    }

    @Test
    void cancelledAppointmentsDoNotOccupyTheirSlot() {
        Appointment cancelled = new Appointment(
                null,
                "VD-0002",
                1L,
                1L,
                1L,
                DATE,
                LocalTime.of(10, 0),
                30,
                AppointmentStatus.CANCELADA,
                AppointmentOrigin.WEB,
                "hash");

        assertThatCode(() -> appointmentAt(LocalTime.of(10, 0), 30).ensureNoOverlap(List.of(cancelled)))
                .doesNotThrowAnyException();
    }
}
