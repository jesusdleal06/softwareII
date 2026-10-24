package co.edu.unipamplona.villadent.modules.users.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "El correo es obligatorio.") String email,
        @NotBlank(message = "La contraseña es obligatoria.") String password) {
}
