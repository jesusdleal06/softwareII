package co.edu.unipamplona.villadent.modules.dentists.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.Dentist;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivens.DentistRepository;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import org.springframework.transaction.annotation.Transactional;

public class RegisterDentistService implements RegisterDentistUseCase {

    private final DentistRepository dentists;

    public RegisterDentistService(DentistRepository dentists) {
        this.dentists = dentists;
    }

    @Override
    @Transactional
    public DentistResult register(RegisterDentistCommand command) {
        if (command.userId() != null && dentists.findByUserId(command.userId()).isPresent()) {
            throw new ConflictException(
                    "DENTIST_USER_ALREADY_LINKED",
                    "Ya existe un odontólogo vinculado a ese usuario.");
        }
        Dentist dentist = Dentist.create(command.name(), command.specialty(), command.userId());
        return toResult(dentists.save(dentist));
    }

    static DentistResult toResult(Dentist dentist) {
        return new DentistResult(
                dentist.id(),
                dentist.name(),
                dentist.specialty(),
                dentist.userId(),
                dentist.isActive());
    }
}
