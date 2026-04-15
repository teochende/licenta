package com.example.hrdatabase.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Locale;

public class HrsimEmailDomainValidator implements ConstraintValidator<HrsimEmailDomain, String> {

    private static final String REQUIRED_DOMAIN = "hrsim.ro";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String trimmed = value.trim();
        int at = trimmed.lastIndexOf('@');
        if (at < 0 || at == trimmed.length() - 1) {
            return false;
        }
        String domain = trimmed.substring(at + 1).toLowerCase(Locale.ROOT);
        return REQUIRED_DOMAIN.equals(domain);
    }
}
