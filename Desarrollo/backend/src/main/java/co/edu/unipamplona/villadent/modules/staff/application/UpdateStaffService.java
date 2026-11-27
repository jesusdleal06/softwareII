package co.edu.unipamplona.villadent.modules.staff.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistByUserIdUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateDentistIdentityUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.StaffSummary;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.UpdateStaffUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UpdateUserIdentityUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import org.springframework.transaction.annotation.Transactional;

public class UpdateStaffService implements UpdateStaffUseCase {

    private final FindUserUseCase findUser;
    private final UpdateUserIdentityUseCase updateUser;
    private final FindDentistByUserIdUseCase findDentist;
    private final UpdateDentistIdentityUseCase updateDentist;

    public UpdateStaffService(FindUserUseCase findUser, UpdateUserIdentityUseCase updateUser,
                              FindDentistByUserIdUseCase findDentist, UpdateDentistIdentityUseCase updateDentist) {
        this.findUser = findUser;
        this.updateUser = updateUser;
        this.findDentist = findDentist;
        this.updateDentist = updateDentist;
    }

    @Override
    @Transactional
    public StaffSummary update(Long id, UpdateStaffCommand command) {
        UserSummary current = findUser.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el usuario."));
        UserSummary user = updateUser.updateIdentity(id,
                new UpdateUserIdentityUseCase.UpdateUserIdentityCommand(command.name(), command.email()));
        Long dentistId = null;
        String specialty = null;
        if (current.role() == Role.ODONTOLOGO) {
            DentistResult dentist = findDentist.findByUserId(id)
                    .orElseThrow(() -> new NotFoundException("No se encontró el odontólogo."));
            String nextSpecialty = command.specialty() == null || command.specialty().isBlank()
                    ? dentist.specialty() : command.specialty().trim();
            DentistResult updated = updateDentist.updateIdentity(dentist.id(), user.name(), nextSpecialty);
            dentistId = updated.id();
            specialty = updated.specialty();
        }
        return new StaffSummary(user.id(), user.name(), user.email(), user.role(), user.active(),
                dentistId, specialty);
    }
}
