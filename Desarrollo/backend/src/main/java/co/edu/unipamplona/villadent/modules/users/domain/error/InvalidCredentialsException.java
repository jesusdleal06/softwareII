package co.edu.unipamplona.villadent.modules.users.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class InvalidCredentialsException extends DomainException {

    public static final String MESSAGE =
            "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.";

    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS", MESSAGE, 401);
    }
}
