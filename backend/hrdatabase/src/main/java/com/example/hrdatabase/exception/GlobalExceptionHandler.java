package com.example.hrdatabase.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err ->
                fieldErrors.put(err.getField(), err.getDefaultMessage() != null ? err.getDefaultMessage() : "invalid"));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse("Date de intrare invalide", fieldErrors));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(ex.getMessage(), null));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse("Email sau parolă incorecte", null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        String msg = ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "Nu aveți drepturi pentru această operație";
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(msg, null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        String sqlState = findSqlState(ex);
        String detail = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        log.warn("DataIntegrityViolation sqlState={} detail={}", sqlState, detail);

        String userMessage = switch (sqlState != null ? sqlState : "") {
            case "22021" -> "Textul conține caractere nepermise (ex.: fișier PDF/DOC citit ca text, cu octeți nuli). Reîncarcă pagina sau folosește CV .txt.";
            case "23505" -> "Înregistrare duplicată (ex.: ați aplicat deja la acest post cu același email).";
            case "23503" -> "Referință invalidă către altă înregistrare (date inconsistente).";
            case "23502" -> "Lipsesc câmpuri obligatorii în baza de date.";
            default -> "Date în conflict cu constrângerile din baza de date (ex.: valoare duplicată).";
        };
        HttpStatus status = "22021".equals(sqlState) ? HttpStatus.BAD_REQUEST : HttpStatus.CONFLICT;
        return ResponseEntity
                .status(status)
                .body(new ApiErrorResponse(userMessage, null));
    }

    private static String findSqlState(Throwable ex) {
        Throwable t = ex;
        while (t != null) {
            if (t instanceof SQLException sql) {
                return sql.getSQLState();
            }
            t = t.getCause();
        }
        return null;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex) {
        log.error("Eroare neprevăzută (vezi stack trace mai jos)", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse("Eroare internă de server", null));
    }
}
