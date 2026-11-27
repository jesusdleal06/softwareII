package co.edu.unipamplona.villadent.modules.users.application;

import co.edu.unipamplona.villadent.modules.users.domain.error.EmailAlreadyExistsException;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UpdateUserIdentityUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class UpdateUserIdentityService implements UpdateUserIdentityUseCase {

    private final UserRepository users;

    public UpdateUserIdentityService(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional
    public UserSummary updateIdentity(Long id, UpdateUserIdentityCommand command) {
        User user = users.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el usuario."));
        String email = User.normalizeEmail(command.email());
        users.findByEmail(email)
                .filter(found -> !found.id().equals(id))
                .ifPresent(found -> {
                    throw new EmailAlreadyExistsException();
                });
        return RegisterUserService.toSummary(users.save(user.changeIdentity(command.name(), email)));
    }
}
