package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import java.time.LocalDate;

public interface GenerateReportUseCase {

    Report generate(LocalDate from, LocalDate to, Long dentistId);
}
