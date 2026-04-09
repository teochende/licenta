package com.example.hrdatabase.security;

import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class SecurityUserDetailsService implements UserDetailsService {

    private final UtilizatorRepository utilizatorRepository;

    public SecurityUserDetailsService(UtilizatorRepository utilizatorRepository) {
        this.utilizatorRepository = utilizatorRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return utilizatorRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizator negăsit: " + username));
    }
}
