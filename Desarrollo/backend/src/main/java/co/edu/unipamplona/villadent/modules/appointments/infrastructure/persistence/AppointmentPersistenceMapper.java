package co.edu.unipamplona.villadent.modules.appointments.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.Appointment;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface AppointmentPersistenceMapper {

    @Mapping(target = "id", expression = "java(appointment.id())")
    @Mapping(target = "code", expression = "java(appointment.code())")
    @Mapping(target = "patientId", expression = "java(appointment.patientId())")
    @Mapping(target = "dentistId", expression = "java(appointment.dentistId())")
    @Mapping(target = "procedureId", expression = "java(appointment.procedureId())")
    @Mapping(target = "date", expression = "java(appointment.date())")
    @Mapping(target = "time", expression = "java(appointment.time())")
    @Mapping(target = "durationMinutes", expression = "java(appointment.durationMinutes())")
    @Mapping(target = "status", expression = "java(appointment.status())")
    @Mapping(target = "origin", expression = "java(appointment.origin())")
    @Mapping(target = "tokenHash", expression = "java(appointment.tokenHash())")
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(Appointment appointment, @MappingTarget AppointmentJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "code", source = "entity.code")
    @Mapping(target = "patientId", source = "entity.patientId")
    @Mapping(target = "dentistId", source = "entity.dentistId")
    @Mapping(target = "procedureId", source = "entity.procedureId")
    @Mapping(target = "date", source = "entity.date")
    @Mapping(target = "time", source = "entity.time")
    @Mapping(target = "durationMinutes", source = "entity.durationMinutes")
    @Mapping(target = "status", source = "entity.status")
    @Mapping(target = "origin", source = "entity.origin")
    @Mapping(target = "tokenHash", source = "entity.tokenHash")
    @Mapping(target = "withTokenHash", ignore = true)
    Appointment toDomain(AppointmentJpaEntity entity);
}
