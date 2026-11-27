package co.edu.unipamplona.villadent.modules.staff.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.RegisterDentistUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.error.InvalidStaffDataException;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.RegisterStaffUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.StaffSummary;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.RegisterUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the staff account and, for an odontólogo, its dentist record in the same
 * transaction: a failure while linking the dentist rolls the user back.
 */
public class RegisterStaffService implements RegisterStaffUseCase {

    private final RegisterUserUseCase registerUser;
    private final RegisterDentistUseCase registerDentist;

    public RegisterStaffService(RegisterUserUseCase registerUser, RegisterDentistUseCase registerDentist) {
        this.registerUser = registerUser;
        this.registerDentist = registerDentist;
    }

    @Override
    @Transactional
    public StaffSummary register(RegisterStaffCommand command) {
        String specialty = command.role() == Role.ODONTOLOGO ? requireSpecialty(command.specialty()) : null;
        UserSummary user = registerUser.register(new RegisterUserUseCase.RegisterUserCommand(
                command.name(), command.email(), command.password(), command.role()));
        Long dentistId = null;
        String dentistSpecialty = null;
        if (command.role() == Role.ODONTOLOGO) {
            DentistResult dentist = registerDentist.register(new RegisterDentistUseCase.RegisterDentistCommand(
                    user.name(), specialty, user.id()));
            dentistId = dentist.id();
            dentistSpecialty = dentist.specialty();
        }
        return new StaffSummary(user.id(), user.name(), user.email(), user.role(), user.active(),
                dentistId, dentistSpecialty);
    }

    static String requireSpecialty(String specialty) {
        if (specialty == null || specialty.isBlank()) {
            throw new InvalidStaffDataException("La especialidad del odontólogo es obligatoria.");
        }
        return specialty.trim();
    }
}
