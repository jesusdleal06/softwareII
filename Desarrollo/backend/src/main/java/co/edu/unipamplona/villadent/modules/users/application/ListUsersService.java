package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.ListUsersUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListUsersService implements ListUsersUseCase {

    private final UserRepository users;

    public ListUsersService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummary> list() {
        return users.findAll().stream()
                .map(RegisterUserService::toSummary)
                .toList();
    }
}
