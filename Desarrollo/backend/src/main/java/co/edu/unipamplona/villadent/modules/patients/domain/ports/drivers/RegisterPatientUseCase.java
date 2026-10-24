package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

public interface RegisterPatientUseCase {

    PatientResult register(RegisterPatientCommand command);

    record RegisterPatientCommand(String fullName, String phone) {
    }
}
