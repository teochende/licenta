package com.example.hrdatabase.dto.request;

import jakarta.validation.constraints.NotNull;

public record AplicatiePipelinePatchRequest(
        @NotNull(message = "Starea pipeline este obligatorie")
        String pipelineStateJson
) {
}
