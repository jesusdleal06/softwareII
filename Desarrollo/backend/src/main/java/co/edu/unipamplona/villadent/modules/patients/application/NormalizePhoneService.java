package co.edu.unipamplona.villadent.modules.patients.application;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;

public class NormalizePhoneService implements NormalizePhoneUseCase {

    @Override
    public String normalize(String phone) {
        return Patient.normalizePhone(phone);
    }
}
