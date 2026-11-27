package co.edu.unipamplona.villadent.modules.dentists.domain.error;

import co.edu.unipamplona.villadent.shared.error.DomainException;

public class DentistPhotoUploadException extends DomainException {
    public DentistPhotoUploadException(Throwable cause) {
        super("DENTIST_PHOTO_UPLOAD_FAILED", "No pudimos subir la imagen. Intenta de nuevo.", 502, cause);
    }
}
