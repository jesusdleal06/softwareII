package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.ListDentistsUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public class ListDentistsService implements ListDentistsUseCase {

    private final DentistRepository dentists;

    public ListDentistsService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentistResult> list() {
        return dentists.findAll().stream().map(RegisterDentistService::toResult).toList();
    }
}
