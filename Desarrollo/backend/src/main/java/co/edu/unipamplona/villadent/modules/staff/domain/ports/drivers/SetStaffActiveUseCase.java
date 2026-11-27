package co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers;

/**
 * Deactivation is the "delete" of the admin panel. The acting user id comes from
 * the session so an auxiliar cannot lock themselves out.
 */
public interface SetStaffActiveUseCase {

    StaffSummary setActive(Long actingUserId, Long id, boolean active);
}
