package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface RegisterDentistUseCase {

    DentistResult register(RegisterDentistCommand command);

    record RegisterDentistCommand(String name, String specialty, Long userId) {
    }
}
