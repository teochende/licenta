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
}
