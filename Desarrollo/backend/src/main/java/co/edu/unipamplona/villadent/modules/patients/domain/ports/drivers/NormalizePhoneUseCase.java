package co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers;

public interface NormalizePhoneUseCase {

    /**
     * Applies the patient phone rules and returns the 10 digit canonical form.
     */
    String normalize(String phone);
}
