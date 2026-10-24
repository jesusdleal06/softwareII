package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

public interface ResolvePatientUseCase {

    PatientResult resolve(ResolvePatientCommand command);

    record ResolvePatientCommand(String fullName, String phone) {
    }
}
