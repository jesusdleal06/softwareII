package co.edu.unipamplona.villadent.shared.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProblemDetailAdvice {

    @ExceptionHandler(DomainException.class)
    public ProblemDetail handleDomainException(DomainException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatus());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, exception.getDetail());
        problemDetail.setTitle(exception.getErrorCode());
        problemDetail.setProperty("code", exception.getErrorCode());
        return problemDetail;
    }
}
