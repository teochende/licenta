package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.LoginRequestDTO;
import com.example.hrdatabase.dto.request.RegisterPublicRequestDTO;
import com.example.hrdatabase.dto.response.AuthLoginResponse;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.service.AuthService;
import com.example.hrdatabase.service.UtilizatorService;
import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UtilizatorService utilizatorService;

    public AuthController(AuthService authService, UtilizatorService utilizatorService) {
        this.authService = authService;
        this.utilizatorService = utilizatorService;
    }

    @PostMapping("/register")
    public UtilizatorResponseDTO register(@Valid @RequestBody RegisterPublicRequestDTO request) {
        return utilizatorService.registerPublic(request);
    }

    @PostMapping("/login")
    public AuthLoginResponse login(@Valid @RequestBody LoginRequestDTO request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UtilizatorResponseDTO me(@AuthenticationPrincipal Utilizator utilizator) {
        if (utilizator == null || utilizator.getId() == null) {
            throw new AccessDeniedException("Neautentificat");
        }
        return utilizatorService.getProfile(utilizator.getId());
    }
}
