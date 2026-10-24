package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class FindUserService implements FindUserUseCase {

    private final UserRepository users;

    public FindUserService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserSummary> findById(Long id) {
        return users.findById(id).map(RegisterUserService::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserSummary> findByEmail(String email) {
        return users.findByEmail(email).map(RegisterUserService::toSummary);
    }
}
