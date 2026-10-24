package co.edu.unipamplona.villadent.modules.patients.infrastructure.web;

public record PatientResponse(Long id, String fullName, String phone, boolean active) {
}
