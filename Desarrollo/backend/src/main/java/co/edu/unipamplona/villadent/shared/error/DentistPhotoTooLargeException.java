package co.edu.unipamplona.villadent.shared.error;

public class DentistPhotoTooLargeException extends DomainException {
    public DentistPhotoTooLargeException() {
        super("DENTIST_PHOTO_TOO_LARGE", "La imagen no puede superar 5 MB.", 400);
    }
}
