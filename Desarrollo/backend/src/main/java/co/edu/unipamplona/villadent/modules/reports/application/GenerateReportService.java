package co.edu.unipamplona.villadent.modules.reports.application;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentReportRow;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAppointmentReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import java.time.LocalDate;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class GenerateReportService implements GenerateReportUseCase {

    private final GetAppointmentReportUseCase appointmentReports;

    public GenerateReportService(GetAppointmentReportUseCase appointmentReports) {
        this.appointmentReports = appointmentReports;
    }

    @Override
    @Transactional(readOnly = true)
    public Report generate(LocalDate from, LocalDate to, Long dentistId) {
        Report.requireValidRange(from, to);
        List<AppointmentReportRow> rows = appointmentReports.between(from, to, dentistId);
        return Report.build(from, to, dentistId, rows);
    }
}
