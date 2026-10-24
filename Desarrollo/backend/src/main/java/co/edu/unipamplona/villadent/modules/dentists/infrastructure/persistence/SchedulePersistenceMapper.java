package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Schedule;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface SchedulePersistenceMapper {

    @Mapping(target = "id", expression = "java(schedule.id())")
    @Mapping(target = "dentistId", expression = "java(schedule.dentistId())")
    @Mapping(target = "dayOfWeek", expression = "java(schedule.dayOfWeek())")
    @Mapping(target = "start", expression = "java(schedule.start())")
    @Mapping(target = "end", expression = "java(schedule.end())")
    @Mapping(target = "active", expression = "java(schedule.isActive())")
    void updateEntity(Schedule schedule, @MappingTarget ScheduleJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "dentistId", source = "entity.dentistId")
    @Mapping(target = "dayOfWeek", source = "entity.dayOfWeek")
    @Mapping(target = "start", source = "entity.start")
    @Mapping(target = "end", source = "entity.end")
    @Mapping(target = "active", source = "entity.active")
    @Mapping(target = "changeActive", ignore = true)
    Schedule toDomain(ScheduleJpaEntity entity);
}
