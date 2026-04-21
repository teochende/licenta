package com.example.hrdatabase.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PostReopenRequest(
        /**
         * Dacă e setat, suprascrie nrPozitii (minim 1) la redeschidere.
         * Dacă lipsește, sistemul îl setează automat la {@code ocupate + 1}.
         */
        @JsonProperty("nrPozitiiNou") Integer nrPozitiiNou
) {
}

