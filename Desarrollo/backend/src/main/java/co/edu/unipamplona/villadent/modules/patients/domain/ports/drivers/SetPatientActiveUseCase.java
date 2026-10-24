package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

public interface SetPatientActiveUseCase {

    PatientResult setActive(Long id, boolean active);
}
