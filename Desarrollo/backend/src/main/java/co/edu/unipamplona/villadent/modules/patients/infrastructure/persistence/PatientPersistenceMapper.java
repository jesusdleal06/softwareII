package co.edu.unipamplona.villadent.modules.patients.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface PatientPersistenceMapper {

    @Mapping(target = "id", expression = "java(patient.id())")
    @Mapping(target = "fullName", expression = "java(patient.fullName())")
    @Mapping(target = "phone", expression = "java(patient.phone())")
    @Mapping(target = "active", expression = "java(patient.isActive())")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(Patient patient, @MappingTarget PatientJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "fullName", source = "entity.fullName")
    @Mapping(target = "phone", source = "entity.phone")
    @Mapping(target = "active", source = "entity.active")
    @Mapping(target = "changeActive", ignore = true)
    @Mapping(target = "reactivate", ignore = true)
    Patient toDomain(PatientJpaEntity entity);
}
