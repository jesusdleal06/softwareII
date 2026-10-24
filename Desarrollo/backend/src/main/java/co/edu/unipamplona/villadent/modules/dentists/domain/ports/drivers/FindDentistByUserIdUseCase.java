package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.util.Optional;

public interface FindDentistByUserIdUseCase {

    Optional<DentistResult> findByUserId(Long userId);
}
