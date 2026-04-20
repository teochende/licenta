package com.example.hrdatabase.repository;

import com.example.hrdatabase.entity.Departament;
import com.example.hrdatabase.entity.Rol;
import com.example.hrdatabase.entity.Utilizator;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class UtilizatorSpecifications {

    private UtilizatorSpecifications() {
    }

    /**
     * Filtrare admin + ordonare: conturile {@link Rol#GUEST} (în așteptare) primele, apoi restul, după id descrescător.
     * {@code orderBy} se omite pentru query-ul de count (Spring Data).
     */
    public static Specification<Utilizator> filtered(String q, Rol rol, Long departamentId) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (StringUtils.hasText(q)) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("numeUtilizator")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)));
            }
            if (rol != null) {
                preds.add(cb.equal(root.get("rol"), rol));
            }
            if (departamentId != null) {
                Join<Utilizator, Departament> dep = root.join("departament", JoinType.LEFT);
                preds.add(cb.equal(dep.get("id"), departamentId));
            }
            if (query != null) {
                if (departamentId != null) {
                    query.distinct(true);
                }
                if (!Long.class.equals(query.getResultType())) {
                    query.orderBy(
                            cb.asc(cb.selectCase()
                                    .when(cb.equal(root.get("rol"), Rol.GUEST), 0)
                                    .otherwise(1)),
                            cb.desc(root.get("id")));
                }
            }
            if (preds.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(preds.toArray(Predicate[]::new));
        };
    }
}
