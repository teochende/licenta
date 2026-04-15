package com.example.hrdatabase.entity;

/**
 * Roluri aplicație. {@link com.example.hrdatabase.entity.Utilizator} mapează la autorități Spring {@code ROLE_<nume>}.
 * {@link #ADMIN} are privilegii maxime (gestiune utilizatori, alocări, configurare).
 */
public enum Rol {
    ADMIN,
    INTERVIEVATOR_TEHNIC,
    RECRUTOR,
    MANAGER_RECRUTARE,
    MANAGER_DEPARTAMENT,
    /** Cont creat prin auto-înregistrare; așteaptă validare de la administrator. */
    GUEST
}
