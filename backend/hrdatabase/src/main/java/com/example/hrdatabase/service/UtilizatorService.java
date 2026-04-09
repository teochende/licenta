package com.example.hrdatabase.service;

import com.example.hrdatabase.dto.request.UtilizatorRequestDTO;
import com.example.hrdatabase.dto.response.UtilizatorResponseDTO;
import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Utilizator;
import com.example.hrdatabase.mapper.UtilizatorMapper;
import com.example.hrdatabase.dto.request.UtilizatorUpdateRequestDTO;
import com.example.hrdatabase.repository.DepartamentRepository;
import com.example.hrdatabase.repository.UtilizatorRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class UtilizatorService {

    private final UtilizatorRepository utilizatorRepository;
    private final DepartamentRepository departamentRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UtilizatorService(
            UtilizatorRepository utilizatorRepository,
            DepartamentRepository departamentRepository,
            BCryptPasswordEncoder passwordEncoder) {
        this.utilizatorRepository = utilizatorRepository;
        this.departamentRepository = departamentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creare utilizator: parola din request este înlocuită cu {@link BCryptPasswordEncoder#encode(CharSequence)}
     * înainte de persistare.
     */
    @Transactional
    public UtilizatorResponseDTO save(UtilizatorRequestDTO request) {
        Departament departament = null;
        if (request.departamentId() != null) {
            departament = departamentRepository.findById(request.departamentId())
                    .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
        }
        Utilizator utilizator = UtilizatorMapper.toEntity(request, departament);
        utilizator.setParola(passwordEncoder.encode(request.parola()));
        return UtilizatorMapper.toResponse(utilizatorRepository.save(utilizator));
    }

    /**
     * Actualizare parțială: parola este re-criptată doar dacă este trimisă o valoare nevidă;
     * altfel se păstrează hash-ul existent (evită dubla criptare).
     */
    @Transactional
    public UtilizatorResponseDTO update(Long id, UtilizatorUpdateRequestDTO request) {
        if (request.numeUtilizator() == null && request.email() == null && request.rol() == null
                && request.departamentId() == null && request.parola() == null) {
            throw new IllegalArgumentException("Cel puțin un câmp trebuie furnizat pentru actualizare");
        }

        Utilizator utilizator = utilizatorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator inexistent: " + id));

        if (request.numeUtilizator() != null) {
            utilizator.setNumeUtilizator(request.numeUtilizator());
        }
        if (request.email() != null) {
            utilizator.setEmail(request.email());
        }
        if (request.rol() != null) {
            utilizator.setRol(request.rol());
        }
        if (request.departamentId() != null) {
            Departament departament = departamentRepository.findById(request.departamentId())
                    .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + request.departamentId()));
            utilizator.setDepartament(departament);
        }
        if (StringUtils.hasText(request.parola())) {
            utilizator.setParola(passwordEncoder.encode(request.parola()));
        }

        return UtilizatorMapper.toResponse(utilizatorRepository.save(utilizator));
    }

    public List<UtilizatorResponseDTO> findAll() {
        return utilizatorRepository.findAll().stream()
                .map(UtilizatorMapper::toResponse)
                .toList();
    }
}
