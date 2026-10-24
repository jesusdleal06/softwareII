package co.edu.unipamplona.villadent.modules.users.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {

    Optional<User> findByEmail(String email);

    Optional<User> findById(Long id);

    List<User> findAll();

    boolean existsActiveByRole(Role role);

    User save(User user);
}
