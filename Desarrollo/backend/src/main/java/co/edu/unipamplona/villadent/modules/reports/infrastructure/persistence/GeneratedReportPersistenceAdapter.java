package co.edu.unipamplona.villadent.modules.reports.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reports.domain.model.GeneratedReport;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.GeneratedReportRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class GeneratedReportPersistenceAdapter implements GeneratedReportRepository {

    private final GeneratedReportJpaRepository reports;
    private final GeneratedReportPersistenceMapper mapper;

    public GeneratedReportPersistenceAdapter(GeneratedReportJpaRepository reports,
                                             GeneratedReportPersistenceMapper mapper) {
        this.reports = reports;
        this.mapper = mapper;
    }

    @Override
    public void save(GeneratedReport report) {
        reports.save(mapper.toEntity(report));
    }

    @Override
    public List<GeneratedReport> recent() {
        return reports.findTop50ByOrderByGeneratedAtDescIdDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<GeneratedReport> findById(long id) {
        return reports.findById(id).map(mapper::toDomain);
    }
}
