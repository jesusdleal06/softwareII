package co.edu.unipamplona.villadent.modules.staff.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

/**
 * One staff member as the admin panel needs it: the user account plus, for an
 * odontólogo, the linked dentist record.
 */
public record StaffSummary(Long id, String name, String email, Role role, boolean active,
                           Long dentistId, String specialty) {
}
