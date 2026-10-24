package co.edu.unipamplona.villadent.modules.appointments.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class SlotTakenException extends DomainException {

    public SlotTakenException(String detail) {
        super("SLOT_TAKEN", detail, 409);
    }
}
