package com.example.hrdatabase.exception;

import java.util.Map;

public record ApiErrorResponse(String message, Map<String, String> fieldErrors) {
}
