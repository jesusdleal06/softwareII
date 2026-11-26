package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.UpdateOwnDentistProfileUseCase.ProfileUpdate;

public interface RegisterDentistUseCase {

    DentistResult register(RegisterDentistCommand command);

    record RegisterDentistCommand(String name, String specialty, Long userId, ProfileUpdate initialProfile) {
        public RegisterDentistCommand(String name, String specialty, Long userId) {
            this(name, specialty, userId, null);
        }
    }
}
