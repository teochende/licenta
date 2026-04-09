import { createContext } from "react";

const LoginContext = createContext({
    nume: ``,
    isAuthenticated: false,
    rol: ``
});

export const ROLURI = {
    INTERVIEVATOR_TEHNIC: 'intervievator_tehnic',
    RECRUTOR: 'recrutor',
    MANAGER_RECRUTARE: 'manager_recrutare',
    MANAGER_DEPARTAMENT: 'manager_departament'
};

export default LoginContext;