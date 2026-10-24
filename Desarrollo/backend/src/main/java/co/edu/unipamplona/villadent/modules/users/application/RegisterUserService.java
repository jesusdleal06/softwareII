package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.error.EmailAlreadyExistsException;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.PasswordHasher;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import org.springframework.transaction.annotation.Transactional;

public class RegisterUserService implements RegisterUserUseCase {

    private final UserRepository users;
    private final PasswordHasher passwordHasher;

    public RegisterUserService(UserRepository users, PasswordHasher passwordHasher) {
        this.users = users;
        this.passwordHasher = passwordHasher;
    }

    @Override
    @Transactional
    public UserSummary register(RegisterUserCommand command) {
        String email = User.normalizeEmail(command.email());
        if (users.findByEmail(email).isPresent()) {
            throw new EmailAlreadyExistsException();
        }
        User user = User.create(
                command.name(),
                email,
                passwordHasher.hash(command.password()),
                command.role());
        return toSummary(users.save(user));
    }

    static UserSummary toSummary(User user) {
        return new UserSummary(user.id(), user.name(), user.email(), user.role(), user.isActive());
    }
}
