package com.example.hrdatabase.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PostPatchRequest(
        @JsonProperty("descriere") String descriere,
        @JsonProperty("enabled") Boolean enabled,
        /** critic | mare | medie | mica */
        @JsonProperty("prioritate") String prioritate,
        @JsonProperty("ordineDashboard") Integer ordineDashboard,
        /** Număr poziții planificate (minim 1). */
        @JsonProperty("nrPozitii") Integer nrPozitii
) {
}
