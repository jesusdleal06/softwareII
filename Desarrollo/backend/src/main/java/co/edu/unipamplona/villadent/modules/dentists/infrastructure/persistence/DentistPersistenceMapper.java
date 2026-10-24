package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface DentistPersistenceMapper {

    @Mapping(target = "id", expression = "java(dentist.id())")
    @Mapping(target = "name", expression = "java(dentist.name())")
    @Mapping(target = "specialty", expression = "java(dentist.specialty())")
    @Mapping(target = "userId", expression = "java(dentist.userId())")
    @Mapping(target = "active", expression = "java(dentist.isActive())")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(Dentist dentist, @MappingTarget DentistJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "name", source = "entity.name")
    @Mapping(target = "specialty", source = "entity.specialty")
    @Mapping(target = "userId", source = "entity.userId")
    @Mapping(target = "active", source = "entity.active")
    @Mapping(target = "changeActive", ignore = true)
    Dentist toDomain(DentistJpaEntity entity);
}
