package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.entity.CerereAngajare;

public final class CerereAngajareMapper {

    private CerereAngajareMapper() {
    }

    public static CerereAngajareViewDto toView(CerereAngajare c) {
        String dep = c.getDepartament() != null ? c.getDepartament().getNume() : "";
        return new CerereAngajareViewDto(
                c.getId(),
                c.getNumePost(),
                c.getDescriere() != null ? c.getDescriere() : "",
                c.getNrPozitii() != null ? c.getNrPozitii() : 1,
                dep,
                c.getStatus(),
                c.getIntervievatoriTehnici().stream().map(u -> u.getNumeUtilizator()).toList());
    }
}
