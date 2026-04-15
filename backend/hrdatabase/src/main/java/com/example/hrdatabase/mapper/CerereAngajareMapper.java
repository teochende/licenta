package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.response.CerereAngajareViewDto;
import com.example.hrdatabase.entity.CerereAngajare;
import com.example.hrdatabase.entity.DescriereCerereMod;

public final class CerereAngajareMapper {

    private CerereAngajareMapper() {
    }

    public static CerereAngajareViewDto toView(CerereAngajare c) {
        String dep = c.getDepartament() != null ? c.getDepartament().getNume() : "";
        DescriereCerereMod mod = c.getDescriereMod() != null ? c.getDescriereMod() : DescriereCerereMod.MANUAL;
        boolean hasFile = mod == DescriereCerereMod.FISIER
                && c.getDescriereFisierPath() != null && !c.getDescriereFisierPath().isBlank();
        return new CerereAngajareViewDto(
                c.getId(),
                c.getNumePost(),
                dep,
                c.getSubdomeniu() != null ? c.getSubdomeniu() : "",
                mod.name(),
                c.getDescriere() != null ? c.getDescriere() : "",
                hasFile,
                c.getDescriereFisierNume() != null ? c.getDescriereFisierNume() : "",
                c.getNrPozitii() != null ? c.getNrPozitii() : 1,
                c.getStatus(),
                c.getIntervievatoriTehnici().stream().map(u -> u.getNumeUtilizator()).toList(),
                c.getIntervievatoriTehnici().stream().map(u -> u.getId()).toList(),
                c.getRecrutori().stream().map(u -> u.getNumeUtilizator()).toList(),
                c.getRecrutori().stream().map(u -> u.getId()).toList());
    }
}
