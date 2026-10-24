package co.edu.unipamplona.villadent.modules.users.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

/** User data safe to cross a module or port boundary: never includes the password hash. */
public record UserSummary(Long id, String name, String email, Role role, boolean active) {
}
