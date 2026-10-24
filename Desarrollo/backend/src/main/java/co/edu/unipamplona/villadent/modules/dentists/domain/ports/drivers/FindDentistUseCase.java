package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import java.util.Optional;

public interface FindDentistUseCase {

    Optional<DentistResult> findById(Long id);
}
