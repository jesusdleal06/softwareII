package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.procedures.domain.model.Procedure;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
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

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "name", source = "entity.name")
    @Mapping(target = "durationMinutes", source = "entity.durationMinutes")
    @Mapping(target = "active", source = "entity.active")
    @Mapping(target = "changeActive", ignore = true)
    Procedure toDomain(ProcedureJpaEntity entity);
}
