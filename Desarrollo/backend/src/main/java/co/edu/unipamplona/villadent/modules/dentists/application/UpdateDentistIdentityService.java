package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateDentistIdentityUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class UpdateDentistIdentityService implements UpdateDentistIdentityUseCase {

    private final DentistRepository dentists;

    public UpdateDentistIdentityService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional
    public DentistResult updateIdentity(Long id, String name, String specialty) {
        Dentist dentist = dentists.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
        Dentist updated = dentist.changeIdentity(name, specialty);
        return RegisterDentistService.toResult(dentists.save(updated));
    }
}
