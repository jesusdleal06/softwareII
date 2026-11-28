package co.edu.unipamplona.villadent.modules.verification.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class PhoneNotVerifiedException extends DomainException {

    public static final String MESSAGE = "Verifica tu número de celular para confirmar la cita.";

    public PhoneNotVerifiedException() {
        super("PHONE_NOT_VERIFIED", MESSAGE, 400);
    }
}
