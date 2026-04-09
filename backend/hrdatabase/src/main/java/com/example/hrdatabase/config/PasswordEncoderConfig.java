package com.example.hrdatabase.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bean-uri pentru hash-ul parolelor (BCrypt). {@link PasswordEncoder} este același
 * tip folosit de Spring Security la autentificare ({@code matches}).
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public BCryptPasswordEncoder bcryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public PasswordEncoder passwordEncoder(BCryptPasswordEncoder bcryptPasswordEncoder) {
        return bcryptPasswordEncoder;
    }
}
