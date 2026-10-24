package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.SetUserActiveUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class SetUserActiveService implements SetUserActiveUseCase {

    private final UserRepository users;

    public SetUserActiveService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional
    public UserSummary setActive(Long id, boolean active) {
        User user = users.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el usuario."));
        return RegisterUserService.toSummary(users.save(user.changeActive(active)));
    }
}
