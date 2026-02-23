import { createContext } from "react";

const LoginContext = createContext({
    nume: ``,
    isAuthenticated: false
});

export default LoginContext;