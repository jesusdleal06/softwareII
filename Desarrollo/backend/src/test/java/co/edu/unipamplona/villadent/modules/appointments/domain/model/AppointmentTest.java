package co.edu.unipamplona.villadent.modules.appointments.domain.model;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.appointments.domain.error.SlotTakenException;
import java.time.LocalDate;
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
