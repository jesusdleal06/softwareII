package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import java.util.List;
import java.util.Optional;

public interface DentistRepository {

    Optional<Dentist> findById(Long id);

    Optional<Dentist> findByUserId(Long userId);

    List<Dentist> findAll();

    Dentist save(Dentist dentist);
}
