package com.example.hrdatabase.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Expresii reutilizabile în {@code @PreAuthorize("@perm....")} — extensibil fără a duplica SpEL.
 */
@Component("perm")
public class PermissionExpressions {

    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority a : auth.getAuthorities()) {
            if (ROLE_ADMIN.equals(a.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
