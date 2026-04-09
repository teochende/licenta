package com.example.hrdatabase.controller;

import com.example.hrdatabase.dto.request.LoginRequestDTO;
import com.example.hrdatabase.dto.request.UtilizatorRequestDTO;
import com.example.hrdatabase.dto.response.AuthLoginResponse;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.service.AuthService;
import com.example.hrdatabase.service.UtilizatorService;
import jakarta.validation.Valid;
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
    public UtilizatorResponseDTO register(@Valid @RequestBody UtilizatorRequestDTO request) {
        return utilizatorService.save(request);
    }

    @PostMapping("/login")
    public AuthLoginResponse login(@Valid @RequestBody LoginRequestDTO request) {
        return authService.login(request);
    }
}
