package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

/** One row of the admin staff panel. `dentistId`/`specialty` are null for auxiliares. */
public record StaffResponse(Long id, String name, String email, Role role, boolean active,
                            Long dentistId, String specialty) {
}
