package co.edu.unipamplona.villadent.modules.reports.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface GeneratedReportJpaRepository extends Repository<GeneratedReportJpaEntity, Long> {
    GeneratedReportJpaEntity save(GeneratedReportJpaEntity entity);
    Optional<GeneratedReportJpaEntity> findById(Long id);
    List<GeneratedReportJpaEntity> findTop50ByOrderByGeneratedAtDescIdDesc();
}
