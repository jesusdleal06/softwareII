package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListActiveDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListActiveDentistsService implements ListActiveDentistsUseCase {

    private final DentistRepository dentists;

    public ListActiveDentistsService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentistResult> listActive() {
        return dentists.findAll().stream()
                .filter(dentist -> dentist.isActive())
                .map(RegisterDentistService::toResult)
                .toList();
    }
}
