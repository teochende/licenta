package com.example.hrdatabase.dto.response;

import java.util.List;

/**
 * Valori distincte pentru filtrele paginii publice de posturi (din toate posturile activate).
 */
public record PosturiDisponibileMetaDto(List<String> domenii, List<String> subdomenii, List<String> niveluri) {}
