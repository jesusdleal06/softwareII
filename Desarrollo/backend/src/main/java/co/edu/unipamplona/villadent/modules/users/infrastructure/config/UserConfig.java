package co.edu.unipamplona.villadent.modules.users.infrastructure.config;

import co.edu.unipamplona.villadent.modules.users.application.FindUserService;
import co.edu.unipamplona.villadent.modules.users.application.ListUsersService;
import co.edu.unipamplona.villadent.modules.users.application.LoginService;
import co.edu.unipamplona.villadent.modules.users.application.RegisterUserService;
import co.edu.unipamplona.villadent.modules.users.application.SetUserActiveService;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.SetUserActiveUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.TokenGenerator;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserConfig {

    @Bean
    public LoginUseCase loginUseCase(
            UserRepository users,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator) {
        return new LoginService(users, passwordHasher, tokenGenerator);
    }

    @Bean
    public RegisterUserUseCase registerUserUseCase(
            UserRepository users,
            PasswordHasher passwordHasher) {
        return new RegisterUserService(users, passwordHasher);
    }

    @Bean
    public ListUsersUseCase listUsersUseCase(UserRepository users) {
        return new ListUsersService(users);
    }

    @Bean
    public SetUserActiveUseCase setUserActiveUseCase(UserRepository users) {
        return new SetUserActiveService(users);
    }

    @Bean
    public FindUserUseCase findUserUseCase(UserRepository users) {
        return new FindUserService(users);
    }
}
