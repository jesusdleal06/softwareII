package co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers;

public interface ReplaceOwnDentistPhotoUseCase {
    DentistResult replace(Long userId, byte[] photo);
}
