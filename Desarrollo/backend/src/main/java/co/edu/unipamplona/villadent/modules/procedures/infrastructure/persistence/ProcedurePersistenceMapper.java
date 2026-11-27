package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface ProcedurePersistenceMapper {

    @Mapping(target = "id", expression = "java(procedure.id())")
    @Mapping(target = "name", expression = "java(procedure.name())")
    @Mapping(target = "durationMinutes", expression = "java(procedure.durationMinutes())")
    @Mapping(target = "active", expression = "java(procedure.isActive())")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(Procedure procedure, @MappingTarget ProcedureJpaEntity entity);

    default Procedure toDomain(ProcedureJpaEntity entity, List<Long> dentistIds) {
        return new Procedure(
                entity.getId(),
                entity.getName(),
                entity.getDurationMinutes(),
                entity.isActive(),
                dentistIds);
    }

    default Procedure toDomain(ProcedureJpaEntity entity) {
        return toDomain(entity, List.of());
    }
}
