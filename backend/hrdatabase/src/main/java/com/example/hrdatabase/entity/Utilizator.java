package com.example.hrdatabase.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "utilizator")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Utilizator implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nume_utilizator", nullable = false, unique = true, length = 64)
    private String numeUtilizator;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false, length = 255)
    private String parola;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 48)
    private Rol rol;

    /**
     * Rol solicitat la înregistrare publică (utilizatorul efectiv rămâne {@link Rol#GUEST} până la validare).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "rol_dorit", length = 48)
    private Rol rolDorit;

    /** Setat pentru roluri precum manager_departament (ex.: „Programare”). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "departament_id")
    @NotFound(action = NotFoundAction.IGNORE)
    private Departament departament;

    protected Utilizator() {
    }

    public Utilizator(String numeUtilizator, String email, String parola, Rol rol, Departament departament) {
        this.numeUtilizator = numeUtilizator;
        this.email = email;
        this.parola = parola;
        this.rol = rol;
        this.departament = departament;
    }

    public Long getId() {
        return id;
    }

    public String getNumeUtilizator() {
        return numeUtilizator;
    }

    public void setNumeUtilizator(String numeUtilizator) {
        this.numeUtilizator = numeUtilizator;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getParola() {
        return parola;
    }

    @Override
    public String getPassword() {
        return parola;
    }

    public void setParola(String parola) {
        this.parola = parola;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public Rol getRolDorit() {
        return rolDorit;
    }

    public void setRolDorit(Rol rolDorit) {
        this.rolDorit = rolDorit;
    }

    public Departament getDepartament() {
        return departament;
    }

    public void setDepartament(Departament departament) {
        this.departament = departament;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    /** Pentru autentificare folosim emailul ca „username” Spring Security. */
    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
