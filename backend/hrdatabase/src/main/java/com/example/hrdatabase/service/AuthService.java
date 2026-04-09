package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.LoginRequestDTO;
import com.example.hrdatabase.dto.response.AuthLoginResponse;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Autentificare: nu se compară manual parola din request cu cea din DB.
 * {@link AuthenticationManager} folosește {@link org.springframework.security.authentication.dao.DaoAuthenticationProvider},
 * care verifică credențialele prin {@link org.springframework.security.crypto.password.PasswordEncoder#matches(CharSequence, String)}
 * (BCrypt) între parola în clar și hash-ul stocat.
 */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthLoginResponse login(LoginRequestDTO request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.parola()));
        Utilizator utilizator = (Utilizator) authentication.getPrincipal();
        String token = jwtService.generateToken(utilizator);
        return new AuthLoginResponse(token, "Bearer", jwtService.getExpirationMs());
    }
}
