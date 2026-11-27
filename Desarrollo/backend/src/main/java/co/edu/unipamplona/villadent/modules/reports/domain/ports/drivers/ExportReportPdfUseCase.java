package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers;

import java.time.LocalDate;

public interface ExportReportPdfUseCase {
    byte[] export(LocalDate from, LocalDate to, Long dentistId, long userId);
}
