package co.edu.unipamplona.villadent.modules.reports.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reports.domain.model.GeneratedReport;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CentralMapperConfig.class)
public interface GeneratedReportPersistenceMapper {
    GeneratedReport toDomain(GeneratedReportJpaEntity entity);
    GeneratedReportJpaEntity toEntity(GeneratedReport report);
}
