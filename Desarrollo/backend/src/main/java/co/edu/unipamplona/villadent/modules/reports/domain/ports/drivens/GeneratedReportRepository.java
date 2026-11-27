package co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.reports.domain.model.GeneratedReport;
import java.util.List;
import java.util.Optional;

public interface GeneratedReportRepository {
    void save(GeneratedReport report);
    List<GeneratedReport> recent();
    Optional<GeneratedReport> findById(long id);
}
