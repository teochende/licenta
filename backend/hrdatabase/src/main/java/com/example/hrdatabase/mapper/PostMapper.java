package com.example.hrdatabase.mapper;

import com.example.hrdatabase.dto.response.PostViewDto;
import com.example.hrdatabase.entity.Post;

public final class PostMapper {

    private PostMapper() {
    }

    /** Varianta fără statistici review (ex. cereri angajare): contoare 0. */
    public static PostViewDto toView(Post p, int ocupateOfertaAdmise) {
        return toView(p, ocupateOfertaAdmise, 0, 0);
    }

    /**
     * @param ocupateOfertaAdmise număr de aplicări pe acest post cu {@code status.oferta == acceptat} în pipeline
     * @param cvAcceptateReviewCv aplicări cu {@code status.oferta == acceptat} (ofertă admisă)
     * @param cvRespinseReviewTehnic aplicări cu orice etapă {@code status.* == respins}
     */
    public static PostViewDto toView(Post p, int ocupateOfertaAdmise, int cvAcceptateReviewCv, int cvRespinseReviewTehnic) {
        String domeniu = p.getDepartament() != null ? p.getDepartament().getNume() : "";
        Long depId = p.getDepartament() != null ? p.getDepartament().getId() : null;
        String pr = p.getPrioritate() != null && !p.getPrioritate().isBlank() ? p.getPrioritate() : "mica";
        int od = p.getOrdineDashboard() != null ? p.getOrdineDashboard() : 0;
        String dfPath = p.getDescriereFisierPath();
        boolean dfStocat = dfPath != null && !dfPath.isBlank();
        String dfNume = p.getDescriereFisierNume() != null ? p.getDescriereFisierNume() : "";
        int nrPoz = p.getNrPozitii() != null && p.getNrPozitii() > 0 ? p.getNrPozitii() : 1;
        int occ = Math.max(0, ocupateOfertaAdmise);
        int pozLib = Math.max(0, nrPoz - occ);
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
                p.getIntervievatori().stream().map(u -> u.getNumeUtilizator()).sorted().toList(),
                nrPoz,
                pozLib,
                Math.max(0, cvAcceptateReviewCv),
                Math.max(0, cvRespinseReviewTehnic)
        );
    }
}
