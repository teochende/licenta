package com.example.hrdatabase.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Ordinea cardurilor de job în dashboard pentru un departament (toate posturile din coloană, în ordinea dorită).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PostDashboardOrderRequest(
        @JsonProperty("departamentId") Long departamentId,
        @JsonProperty("postIdsOrdered") List<Long> postIdsOrdered
) {
}
