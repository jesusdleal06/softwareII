package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class SetDentistActiveService implements SetDentistActiveUseCase {

    private final DentistRepository dentists;

    public SetDentistActiveService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional
    public DentistResult setActive(Long id, boolean active) {
        Dentist dentist = dentists.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        return RegisterDentistService.toResult(dentists.save(dentist.changeActive(active)));
    }
}
