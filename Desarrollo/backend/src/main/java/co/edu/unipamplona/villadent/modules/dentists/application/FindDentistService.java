package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class FindDentistService implements FindDentistUseCase {

    private final DentistRepository dentists;

    public FindDentistService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DentistResult> findById(Long id) {
        return dentists.findById(id).map(RegisterDentistService::toResult);
    }
}
