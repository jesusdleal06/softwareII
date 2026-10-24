package co.edu.unipamplona.villadent.modules.reminders.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.reminders.domain.model.Reminder;
import co.edu.unipamplona.villadent.shared.clock.ClockConfig;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import java.time.Instant;
import java.time.LocalDateTime;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface ReminderPersistenceMapper {

    @Mapping(target = "id", expression = "java(reminder.id())")
    @Mapping(target = "appointmentId", expression = "java(reminder.appointmentId())")
    @Mapping(target = "channel", constant = "WHATSAPP")
    @Mapping(target = "scheduledFor", expression = "java(toInstant(reminder.scheduledFor()))")
    @Mapping(target = "sentAt", expression = "java(toInstant(reminder.sentAt()))")
    @Mapping(target = "status", expression = "java(reminder.status())")
    @Mapping(target = "attempts", expression = "java(reminder.attempts())")
    @Mapping(target = "lastError", expression = "java(reminder.lastError())")
    void updateEntity(Reminder reminder, @MappingTarget ReminderJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "appointmentId", source = "entity.appointmentId")
    @Mapping(target = "scheduledFor", expression = "java(toLocalDateTime(entity.getScheduledFor()))")
    @Mapping(target = "sentAt", expression = "java(toLocalDateTime(entity.getSentAt()))")
    @Mapping(target = "status", source = "entity.status")
    @Mapping(target = "attempts", source = "entity.attempts")
    @Mapping(target = "lastError", source = "entity.lastError")
    @Mapping(target = "sent", ignore = true)
    Reminder toDomain(ReminderJpaEntity entity);

    default Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ClockConfig.ZONE).toInstant();
    }

    default LocalDateTime toLocalDateTime(Instant value) {
        return value == null ? null : LocalDateTime.ofInstant(value, ClockConfig.ZONE);
    }
}
