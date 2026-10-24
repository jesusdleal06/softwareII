package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;

public record UserResponse(
        Long id,
        String name,
        String email,
        Role role,
        boolean active) {
}
