package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.dentists.domain.model.DentistProfile;

public record DentistResult(Long id, String name, String specialty, Long userId, boolean active, DentistProfile profile) {
    public DentistResult(Long id, String name, String specialty, Long userId, boolean active) {
        this(id, name, specialty, userId, active, null);
    }
}
