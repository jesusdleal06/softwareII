package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.error.InvalidCredentialsException;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.LoginUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.IssuedToken;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.TokenGenerator;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import org.springframework.transaction.annotation.Transactional;

public class LoginService implements LoginUseCase {

    private final UserRepository users;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;

    public LoginService(
            UserRepository users,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator) {
        this.users = users;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResult login(LoginCommand command) {
        User user = users.findByEmail(command.email())
                .filter(User::isActive)
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordHasher.matches(command.password(), user.passwordHash())) {
            throw new InvalidCredentialsException();
        }
        IssuedToken token = tokenGenerator.issue(user);
        return new LoginResult(token.token(), token.expiresInSeconds(), user);
    }
}
