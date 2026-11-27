package co.edu.unipamplona.villadent.modules.staff.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistByUserIdUseCase;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.SetDentistActiveUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.SetStaffActiveUseCase;
import co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers.StaffSummary;
import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.FindUserUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.SetUserActiveUseCase;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivers.UserSummary;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import co.edu.unipamplona.villadent.shared.error.NotFoundException;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deactivates/reactivates the account and its dentist record together. The dentist
 * goes first on deactivation so its future-appointment 409 aborts before writing.
 */
public class SetStaffActiveService implements SetStaffActiveUseCase {

    public static final String CANNOT_DEACTIVATE_OWN_ACCOUNT = "CANNOT_DEACTIVATE_OWN_ACCOUNT";
    public static final String OWN_ACCOUNT_DETAIL = "No puede desactivar su propia cuenta.";

    private final FindUserUseCase findUser;
    private final SetUserActiveUseCase setUserActive;
    private final FindDentistByUserIdUseCase findDentist;
    private final SetDentistActiveUseCase setDentistActive;

    public SetStaffActiveService(FindUserUseCase findUser, SetUserActiveUseCase setUserActive,
                                 FindDentistByUserIdUseCase findDentist, SetDentistActiveUseCase setDentistActive) {
        this.findUser = findUser;
        this.setUserActive = setUserActive;
        this.findDentist = findDentist;
        this.setDentistActive = setDentistActive;
    }

    @Override
    @Transactional
    public StaffSummary setActive(Long actingUserId, Long id, boolean active) {
        if (!active && actingUserId != null && actingUserId.equals(id)) {
            throw new ConflictException(CANNOT_DEACTIVATE_OWN_ACCOUNT, OWN_ACCOUNT_DETAIL);
        }
        UserSummary current = findUser.findById(id)
                .orElseThrow(() -> new NotFoundException("No se encontró el usuario."));
        Optional<DentistResult> dentist = current.role() == Role.ODONTOLOGO
                ? findDentist.findByUserId(id) : Optional.empty();
        if (!active && dentist.isPresent()) {
            setDentistActive.setActive(dentist.get().id(), false);
        }
        UserSummary user = setUserActive.setActive(id, active);
        if (active && dentist.isPresent()) {
            setDentistActive.setActive(dentist.get().id(), true);
        }
        return new StaffSummary(user.id(), user.name(), user.email(), user.role(), user.active(),
                dentist.map(DentistResult::id).orElse(null),
                dentist.map(DentistResult::specialty).orElse(null));
    }
}
