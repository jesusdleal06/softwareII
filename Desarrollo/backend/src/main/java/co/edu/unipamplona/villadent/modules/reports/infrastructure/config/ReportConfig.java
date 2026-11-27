package co.edu.unipamplona.villadent.modules.reports.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAppointmentReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.application.ExportReportPdfService;
import co.edu.unipamplona.villadent.modules.reports.application.GenerateReportService;
import co.edu.unipamplona.villadent.modules.reports.application.ReportHistoryService;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.GeneratedReportRepository;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPdfRenderer;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPeople;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportStorage;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ExportReportPdfUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ReportHistoryUseCase;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReportConfig {

    @Bean
    public GenerateReportUseCase generateReportUseCase(GetAppointmentReportUseCase appointmentReports) {
        return new GenerateReportService(appointmentReports);
    }

    @Bean
    public ExportReportPdfUseCase exportReportPdfUseCase(GenerateReportUseCase reports, ReportPeople people,
            ReportPdfRenderer renderer, ReportStorage storage, GeneratedReportRepository history, Clock clock) {
        return new ExportReportPdfService(reports, people, renderer, storage, history, clock);
    }

    @Bean
    public ReportHistoryUseCase reportHistoryUseCase(GeneratedReportRepository history, ReportPeople people,
                                                     ReportStorage storage) {
        return new ReportHistoryService(history, people, storage);
    }
}
