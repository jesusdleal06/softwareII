package co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

public interface RegisterStaffUseCase {

    StaffSummary register(RegisterStaffCommand command);

    record RegisterStaffCommand(String name, String email, String password, Role role, String specialty) {
    }
}
