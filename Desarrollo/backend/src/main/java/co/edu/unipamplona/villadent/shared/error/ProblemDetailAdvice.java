package co.edu.unipamplona.villadent.shared.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException exception) {
        String detail = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("La solicitud no es válida.");
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problemDetail.setTitle("VALIDATION_ERROR");
        problemDetail.setProperty("code", "VALIDATION_ERROR");
        return problemDetail;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "La solicitud no es válida.");
        problemDetail.setTitle("VALIDATION_ERROR");
        problemDetail.setProperty("code", "VALIDATION_ERROR");
        return problemDetail;
    }
}
