package co.edu.unipamplona.villadent.modules.reports.infrastructure.config;

import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.GetAppointmentReportUseCase;
import co.edu.unipamplona.villadent.modules.reports.application.GenerateReportService;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReportConfig {

    @Bean
    public GenerateReportUseCase generateReportUseCase(GetAppointmentReportUseCase appointmentReports) {
        return new GenerateReportService(appointmentReports);
    }
}
