package co.edu.unipamplona.villadent.shared.error;

public abstract class DomainException extends RuntimeException {

    private final String errorCode;
    private final String detail;
    private final int status;

    protected DomainException(String errorCode, String detail, int status) {
        this(errorCode, detail, status, null);
    }

    protected DomainException(String errorCode, String detail, int status, Throwable cause) {
        super(detail, cause);
        this.errorCode = errorCode;
        this.detail = detail;
        this.status = status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getDetail() {
        return detail;
    }

    public int getStatus() {
        return status;
    }
}
