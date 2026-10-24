package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

public record DentistResponse(Long id, String name, String specialty, Long userId, boolean active) {
}
