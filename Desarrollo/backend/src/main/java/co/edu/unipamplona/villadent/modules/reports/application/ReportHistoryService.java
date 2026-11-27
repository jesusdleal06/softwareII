package co.edu.unipamplona.villadent.modules.reports.application;

import co.edu.unipamplona.villadent.modules.reports.domain.error.ReportExportException;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.GeneratedReportRepository;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPeople;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportStorage;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ReportHistoryUseCase;
import java.util.HashMap;
import java.util.List;

public class ReportHistoryService implements ReportHistoryUseCase {

    private final GeneratedReportRepository history;
    private final ReportPeople people;
    private final ReportStorage storage;

    public ReportHistoryService(GeneratedReportRepository history, ReportPeople people, ReportStorage storage) {
        this.history = history;
        this.people = people;
        this.storage = storage;
    }

    @Override
    public List<Entry> recent() {
        var dentistNames = new HashMap<Long, String>();
        var staffNames = new HashMap<Long, String>();
        return history.recent().stream().map(report -> new Entry(report.id(), report.from(), report.to(),
                report.dentistId(), report.dentistId() == null ? null : dentistNames.computeIfAbsent(
                        report.dentistId(), id -> people.dentistName(id).orElseThrow()),
                report.generatedAt(), staffNames.computeIfAbsent(
                        report.userId(), id -> people.staffName(id).orElseThrow()))).toList();
    }

    @Override
    public Download findDownload(long id) {
        var report = history.findById(id).orElseThrow(ReportExportException::reportNotFound);
        return new Download(report.from(), report.to(), target -> {
            try {
                storage.download(report.cloudinaryPublicId(), target);
            } catch (RuntimeException exception) {
                // Do not retain an upstream exception that may include the signed URL.
                throw ReportExportException.downloadFailed();
            }
        });
    }
}
