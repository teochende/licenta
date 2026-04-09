package com.example.hrdatabase.dto.response;

public record AuthLoginResponse(
        String accessToken,
        String tokenType,
        long expiresInMs
) {
}
