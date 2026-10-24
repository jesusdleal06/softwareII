package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistByUserIdUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public class FindDentistByUserIdService implements FindDentistByUserIdUseCase {

    private final DentistRepository dentists;

    public FindDentistByUserIdService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DentistResult> findByUserId(Long userId) {
        return dentists.findByUserId(userId).map(RegisterDentistService::toResult);
    }
}
