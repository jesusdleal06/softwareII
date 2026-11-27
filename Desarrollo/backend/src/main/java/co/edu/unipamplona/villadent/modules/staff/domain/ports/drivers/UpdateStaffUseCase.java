package co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers;

public interface UpdateStaffUseCase {

    StaffSummary update(Long id, UpdateStaffCommand command);

    record UpdateStaffCommand(String name, String email, String specialty) {
    }
}
