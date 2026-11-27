package co.edu.unipamplona.villadent.modules.reports.application;

import co.edu.unipamplona.villadent.modules.reports.domain.error.ReportExportException;
import co.edu.unipamplona.villadent.modules.reports.domain.model.GeneratedReport;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.GeneratedReportRepository;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPdfRenderer;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPeople;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportStorage;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ExportReportPdfUseCase;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.GenerateReportUseCase;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZonedDateTime;

public class ExportReportPdfService implements ExportReportPdfUseCase {

    private static final System.Logger LOG = System.getLogger(ExportReportPdfService.class.getName());
    private final GenerateReportUseCase reports;
    private final ReportPeople people;
    private final ReportPdfRenderer renderer;
    private final ReportStorage storage;
    private final GeneratedReportRepository history;
    private final Clock clock;

    public ExportReportPdfService(GenerateReportUseCase reports, ReportPeople people,
                                  ReportPdfRenderer renderer, ReportStorage storage,
                                  GeneratedReportRepository history, Clock clock) {
        this.reports = reports;
        this.people = people;
        this.renderer = renderer;
        this.storage = storage;
        this.history = history;
        this.clock = clock;
    }

    @Override
    public byte[] export(LocalDate from, LocalDate to, Long dentistId, long userId) {
        var report = reports.generate(from, to, dentistId);
        String dentistName = dentistId == null ? "Todos" : people.dentistName(dentistId)
                .orElseThrow(ReportExportException::dentistNotFound);
        var generatedAt = ZonedDateTime.now(clock);
        byte[] pdf = renderer.render(report, dentistName, generatedAt);

        String publicId;
        try {
            publicId = storage.upload(pdf);
        } catch (RuntimeException exception) {
            LOG.log(System.Logger.Level.WARNING, "Report PDF upload failed ({0}); no history recorded",
                    exception.getClass().getSimpleName());
            return pdf;
        }
        history.save(new GeneratedReport(null, from, to, dentistId, userId, generatedAt.toInstant(), publicId));
        return pdf;
    }
}
