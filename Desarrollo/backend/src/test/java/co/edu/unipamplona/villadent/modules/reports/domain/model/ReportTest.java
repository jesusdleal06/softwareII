package co.edu.unipamplona.villadent.modules.reports.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentReportRow;
import co.edu.unipamplona.villadent.modules.reports.domain.error.InvalidDateRangeException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReportTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 15);

    @Test
    @DisplayName("CP-RF10-01: the report totals attended, cancelled and no-show appointments")
    void totalsTheAppointmentsByStatus() {
        Report report = Report.build(DAY, DAY, null, List.of(
                row(DAY, AppointmentStatus.ATENDIDA),
                row(DAY, AppointmentStatus.ATENDIDA),
                row(DAY, AppointmentStatus.CANCELADA),
                row(DAY, AppointmentStatus.NO_ASISTIO),
                row(DAY, AppointmentStatus.PENDIENTE),
                row(DAY, AppointmentStatus.CONFIRMADA)));

        assertThat(report.total()).isEqualTo(6);
        assertThat(report.attended()).isEqualTo(2);
        assertThat(report.cancelled()).isEqualTo(1);
        assertThat(report.noShow()).isEqualTo(1);
        assertThat(report.noShowRate()).isEqualTo(33);
    }

    @Test
    @DisplayName("CP-RF10-01: the report groups the daily counts by status")
    void groupsDailyCountsByStatus() {
        LocalDate next = DAY.plusDays(1);
        Report report = Report.build(DAY, next, 9L, List.of(
                row(DAY, AppointmentStatus.ATENDIDA),
                row(DAY, AppointmentStatus.NO_ASISTIO),
                row(next, AppointmentStatus.CANCELADA)));

        assertThat(report.dentistId()).isEqualTo(9L);
        assertThat(report.daily()).hasSize(2);
        assertThat(report.daily().getFirst().date()).isEqualTo(DAY);
        assertThat(report.daily().getFirst().total()).isEqualTo(2);
        assertThat(report.daily().getFirst().counts().attended()).isEqualTo(1);
        assertThat(report.daily().getFirst().counts().noShow()).isEqualTo(1);
        assertThat(report.daily().get(1).counts().cancelled()).isEqualTo(1);
    }

    @Test
    @DisplayName("CP-RF10-03: a period without appointments has zero totals")
    void emptyPeriodHasZeroTotals() {
        Report report = Report.build(DAY, DAY, null, List.of());

        assertThat(report.total()).isZero();
        assertThat(report.attended()).isZero();
        assertThat(report.cancelled()).isZero();
        assertThat(report.noShow()).isZero();
        assertThat(report.noShowRate()).isZero();
        assertThat(report.daily()).hasSize(1);
        assertThat(report.daily().getFirst().total()).isZero();
    }

    @Test
    @DisplayName("CP-RF10-04: rejects a range whose start is after its end")
    void rejectsAnInvalidRange() {
        assertThatThrownBy(() -> Report.build(DAY, DAY.minusDays(1), null, List.of()))
                .isInstanceOf(InvalidDateRangeException.class)
                .hasMessage("La fecha final debe ser igual o posterior a la inicial.");
    }

    @Test
    @DisplayName("CP-RF10-04: rejects a missing range boundary")
    void rejectsAMissingBoundary() {
        assertThatThrownBy(() -> Report.build(null, DAY, null, List.of()))
                .isInstanceOf(InvalidDateRangeException.class);
    }

    private static AppointmentReportRow row(LocalDate date, AppointmentStatus status) {
        return new AppointmentReportRow(date, status);
    }
}
