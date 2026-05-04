package com.example.hrdatabase.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Verificări pe JSON-ul pipeline stocat pe {@code aplicatie.pipeline_state}, aliniate cu frontend ({@code status.oferta}).
 */
public final class PipelineJsonUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PipelineJsonUtil() {
    }

    /** Etapa „Ofertă” încheiată cu succes (în UI: Admis) — valoarea {@code acceptat}. */
    public static boolean pipelineOfertaAdmis(String pipelineStateJson) {
        if (pipelineStateJson == null || pipelineStateJson.isBlank()) {
            return false;
        }
        try {
            JsonNode root = MAPPER.readTree(pipelineStateJson);
            JsonNode status = root.get("status");
            if (status == null || !status.isObject()) {
                return false;
            }
            JsonNode v = status.get("oferta");
            return v != null && v.isTextual() && "acceptat".equalsIgnoreCase(v.asText());
        } catch (Exception ignored) {
            return false;
        }
    }

    /** Etapa „Review CV” admisă (manual sau AI) — valoarea {@code acceptat}. */
    public static boolean pipelineReviewCvAdmis(String pipelineStateJson) {
        return pipelineStageStatusEquals(pipelineStateJson, "reviewCv", "acceptat");
    }

    /** Etapa „Review tehnic” respinsă — valoarea {@code respins}. */
    public static boolean pipelineReviewTehnicRespins(String pipelineStateJson) {
        return pipelineStageStatusEquals(pipelineStateJson, "reviewTehnic", "respins");
    }

    private static boolean pipelineStageStatusEquals(String pipelineStateJson, String stageKey, String expected) {
        if (pipelineStateJson == null || pipelineStateJson.isBlank() || stageKey == null || expected == null) {
            return false;
        }
        try {
            JsonNode root = MAPPER.readTree(pipelineStateJson);
            JsonNode status = root.get("status");
            if (status == null || !status.isObject()) {
                return false;
            }
            JsonNode v = status.get(stageKey);
            return v != null && v.isTextual() && expected.equalsIgnoreCase(v.asText());
        } catch (Exception ignored) {
            return false;
        }
    }
}
