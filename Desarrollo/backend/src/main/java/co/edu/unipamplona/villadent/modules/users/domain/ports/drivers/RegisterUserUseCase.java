package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

public interface RegisterUserUseCase {

    UserSummary register(RegisterUserCommand command);

    record RegisterUserCommand(String name, String email, String password, Role role) {
    }
}
