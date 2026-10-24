package co.edu.unipamplona.villadent.modules.users.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CentralMapperConfig.class)
public interface UserPersistenceMapper {

    @Mapping(target = "id", expression = "java(user.id())")
    @Mapping(target = "name", expression = "java(user.name())")
    @Mapping(target = "email", expression = "java(user.email())")
    @Mapping(target = "passwordHash", expression = "java(user.passwordHash())")
    @Mapping(target = "active", expression = "java(user.isActive())")
    @Mapping(target = "roleId", source = "roleId")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(User user, Long roleId, @MappingTarget UserJpaEntity entity);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "name", source = "entity.name")
    @Mapping(target = "email", source = "entity.email")
    @Mapping(target = "passwordHash", source = "entity.passwordHash")
    @Mapping(target = "role", source = "role")
    @Mapping(target = "active", source = "entity.active")
    @Mapping(target = "changeActive", ignore = true)
    User toDomain(UserJpaEntity entity, Role role);
}
