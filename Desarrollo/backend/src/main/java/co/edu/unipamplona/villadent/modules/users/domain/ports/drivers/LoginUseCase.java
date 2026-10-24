package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.users.domain.model.User;

public interface LoginUseCase {

    LoginResult login(LoginCommand command);

    record LoginCommand(String email, String password) {
    }

    record LoginResult(String token, long expiresInSeconds, User user) {
    }
}
