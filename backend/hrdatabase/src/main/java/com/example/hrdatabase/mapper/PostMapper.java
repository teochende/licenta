package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Post;

public final class PostMapper {

    private PostMapper() {
    }

    public static PostViewDto toView(Post p) {
        String domeniu = p.getDepartament() != null ? p.getDepartament().getNume() : "";
        return new PostViewDto(
                p.getId(),
                domeniu,
                p.getSubdomeniu(),
                p.getNume(),
                p.getNivel(),
                p.getDescriere() != null ? p.getDescriere() : "",
                p.isEnabled(),
                p.getRecrutori().stream().map(u -> u.getNumeUtilizator()).sorted().toList(),
                p.getIntervievatori().stream().map(u -> u.getNumeUtilizator()).sorted().toList()
        );
    }
}
