package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RegisterStaffRequest(
        @NotBlank(message = "El nombre es obligatorio.") String name,
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "El correo no es válido.") String email,
        @NotBlank(message = "La contraseña es obligatoria.") String password,
        @NotNull(message = "El rol es obligatorio.") Role role,
        String specialty) {
}
