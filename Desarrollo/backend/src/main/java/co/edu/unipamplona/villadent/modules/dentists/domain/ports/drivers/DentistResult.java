package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public record DentistResult(Long id, String name, String specialty, Long userId, boolean active) {
}
