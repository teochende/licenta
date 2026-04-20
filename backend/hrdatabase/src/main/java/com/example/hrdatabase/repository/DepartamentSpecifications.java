package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Departament;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.Locale;

public final class DepartamentSpecifications {

    private DepartamentSpecifications() {
    }

    public static Specification<Departament> numeContains(String q) {
        return (root, query, cb) -> {
            if (!StringUtils.hasText(q)) {
                return cb.conjunction();
            }
            String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.like(cb.lower(root.get("nume")), pattern);
        };
    }
}
