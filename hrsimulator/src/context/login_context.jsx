import { createContext } from "react";

const LoginContext = createContext({
    nume: ``,
    isAuthenticated: false,
    rol: ``
});

export const ROLURI = {
    ADMIN: 'admin',
    INTERVIEVATOR_TEHNIC: 'intervievator_tehnic',
    RECRUTOR: 'recrutor',
    MANAGER_RECRUTARE: 'manager_recrutare',
    MANAGER_DEPARTAMENT: 'manager_departament',
    GUEST: 'guest',
};

export default LoginContext;