package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers;

import java.io.OutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface ReportHistoryUseCase {
    List<Entry> recent();
    Download findDownload(long id);

    record Entry(Long id, LocalDate from, LocalDate to, Long dentistId, String dentistName,
                 Instant generatedAt, String generatedBy) {}

    record Download(LocalDate from, LocalDate to, Content content) {}

    @FunctionalInterface
    interface Content {
        void writeTo(OutputStream target);
    }
}
