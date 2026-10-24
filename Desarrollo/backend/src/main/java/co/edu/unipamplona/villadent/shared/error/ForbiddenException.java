package co.edu.unipamplona.villadent.shared.error;

public class ForbiddenException extends DomainException {

    public ForbiddenException(String detail) {
        super("FORBIDDEN", detail, 403);
    }
}
