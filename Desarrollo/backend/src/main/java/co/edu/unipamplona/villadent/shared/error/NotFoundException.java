package co.edu.unipamplona.villadent.shared.error;

public class NotFoundException extends DomainException {

    public NotFoundException(String detail) {
        super("NOT_FOUND", detail, 404);
    }
}
