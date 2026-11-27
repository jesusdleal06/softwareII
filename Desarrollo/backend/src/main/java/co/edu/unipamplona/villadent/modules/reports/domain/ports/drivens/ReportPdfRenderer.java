package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import java.time.ZonedDateTime;

public interface ReportPdfRenderer {
    byte[] render(Report report, String dentistName, ZonedDateTime generatedAt);
}
