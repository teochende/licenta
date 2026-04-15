package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Post;

public final class PostMapper {

    private PostMapper() {
    }

    public static PostViewDto toView(Post p) {
        String domeniu = p.getDepartament() != null ? p.getDepartament().getNume() : "";
        Long depId = p.getDepartament() != null ? p.getDepartament().getId() : null;
        String pr = p.getPrioritate() != null && !p.getPrioritate().isBlank() ? p.getPrioritate() : "mica";
        int od = p.getOrdineDashboard() != null ? p.getOrdineDashboard() : 0;
        String dfPath = p.getDescriereFisierPath();
        boolean dfStocat = dfPath != null && !dfPath.isBlank();
        String dfNume = p.getDescriereFisierNume() != null ? p.getDescriereFisierNume() : "";
        return new PostViewDto(
                p.getId(),
                depId,
                domeniu,
                p.getSubdomeniu(),
                p.getNume(),
                p.getNivel(),
                p.getDescriere() != null ? p.getDescriere() : "",
                dfNume,
                dfStocat,
                p.isEnabled(),
                pr,
                od,
                p.getRecrutori().stream().map(u -> u.getNumeUtilizator()).sorted().toList(),
                p.getIntervievatori().stream().map(u -> u.getNumeUtilizator()).sorted().toList()
        );
    }
}
