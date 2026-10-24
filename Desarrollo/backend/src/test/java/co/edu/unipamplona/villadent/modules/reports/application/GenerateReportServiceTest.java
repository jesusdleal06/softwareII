package co.edu.unipamplona.villadent.modules.reports.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentReportRow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAppointmentReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.error.InvalidDateRangeException;
import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GenerateReportServiceTest {

    private static final LocalDate FROM = LocalDate.of(2026, 10, 1);
    private static final LocalDate TO = LocalDate.of(2026, 10, 31);

    @Mock
    private GetAppointmentReportUseCase appointmentReports;

    @InjectMocks
    private GenerateReportService service;

    @Test
    @DisplayName("CP-RF10-01: the service asks for the range and returns the report")
    void asksForTheRangeAndReturnsTheReport() {
        when(appointmentReports.between(FROM, TO, 4L)).thenReturn(List.of(
                new AppointmentReportRow(FROM, AppointmentStatus.ATENDIDA),
                new AppointmentReportRow(FROM, AppointmentStatus.CANCELADA)));

        Report report = service.generate(FROM, TO, 4L);

        assertThat(report.total()).isEqualTo(2);
        assertThat(report.attended()).isEqualTo(1);
        assertThat(report.cancelled()).isEqualTo(1);
        verify(appointmentReports).between(FROM, TO, 4L);
    }

    @Test
    @DisplayName("CP-RF10-04: an invalid range is rejected before querying the appointments")
    void rejectsAnInvalidRangeBeforeQuerying() {
        assertThatThrownBy(() -> service.generate(TO, FROM, null))
                .isInstanceOf(InvalidDateRangeException.class);

        verifyNoInteractions(appointmentReports);
    }
}
