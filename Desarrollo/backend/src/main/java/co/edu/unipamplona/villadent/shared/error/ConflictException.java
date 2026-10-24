package co.edu.unipamplona.villadent.shared.error;

public class ConflictException extends DomainException {

    public ConflictException(String errorCode, String detail) {
        super(errorCode, detail, 409);
    }
}
