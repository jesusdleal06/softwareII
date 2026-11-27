package co.edu.unipamplona.villadent.modules.staff.infrastructure.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateStaffRequest(
        @NotBlank(message = "El nombre es obligatorio.") String name,
        @NotBlank(message = "El correo es obligatorio.") @Email(message = "El correo no es válido.") String email,
        String specialty) {
}
