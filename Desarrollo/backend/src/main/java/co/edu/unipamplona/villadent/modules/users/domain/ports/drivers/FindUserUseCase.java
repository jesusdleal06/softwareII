package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

import java.util.Optional;

public interface FindUserUseCase {

    Optional<UserSummary> findById(Long id);

    Optional<UserSummary> findByEmail(String email);
}
