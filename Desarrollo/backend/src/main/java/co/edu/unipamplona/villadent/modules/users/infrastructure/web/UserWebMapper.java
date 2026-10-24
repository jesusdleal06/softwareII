package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase.LoginCommand;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase.LoginResult;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase.RegisterUserCommand;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface UserWebMapper {

    LoginCommand toCommand(LoginRequest request);

    RegisterUserCommand toCommand(RegisterUserRequest request);

    @Mapping(target = "tokenType", constant = "Bearer")
    @Mapping(target = "user", source = "user")
    LoginResponse toLoginResponse(LoginResult result);

    UserResponse toUserResponse(UserSummary summary);

    @Mapping(target = "id", expression = "java(user.id())")
    @Mapping(target = "name", expression = "java(user.name())")
    @Mapping(target = "email", expression = "java(user.email())")
    @Mapping(target = "role", expression = "java(user.role())")
    @Mapping(target = "active", expression = "java(user.isActive())")
    UserResponse toUserResponse(User user);
}
