import { useContext, useState } from "react"
import MeniuAcasa from "./componente/meniu_acasa"
import MeniuAdministrarePosturi from "./componente/meniu_administrare_posturi"
import MeniuLogin from "./componente/meniu_login"
import LoginContext from "../../context/login_context"
import { ROLURI } from "../../context/login_context"
import { Link } from "react-router-dom"

export default function Toolbar() {
    const { user } = useContext(LoginContext)
    const [menuDeschis, setMenuDeschis] = useState(false)

    const isMd =
        user.isAuthenticated &&
        (user.rol === ROLURI.MANAGER_DEPARTAMENT || user.rol === ROLURI.ADMIN)
    const isMr =
        user.isAuthenticated &&
        (user.rol === ROLURI.MANAGER_RECRUTARE || user.rol === ROLURI.ADMIN)
    const isMrOnly = user.isAuthenticated && user.rol === ROLURI.MANAGER_RECRUTARE

    return (
        <nav className="mainToolbar" aria-label="Meniu principal">
            <button
                type="button"
                className="toolbar-burger"
                aria-expanded={menuDeschis}
                aria-label="Deschide meniul"
                onClick={() => setMenuDeschis((v) => !v)}
            >
                <span className="toolbar-burger-linie" />
                <span className="toolbar-burger-linie" />
                <span className="toolbar-burger-linie" />
            </button>
            <div
                className={`toolbar-nav-links ${menuDeschis ? "toolbar-nav-links-deschis" : ""}`}
                onClick={() => setMenuDeschis(false)}
            >
                <div className="grupPrincipal">
                    <MeniuAcasa />

                    {isMd && (
                        <>
                            <div className="articolMeniu">
                                <Link to="/posturi-departament">Posturi departament</Link>
                            </div>
                            <div className="articolMeniu">
                                <Link to="/cererile-mele">
                                    {user.rol === ROLURI.ADMIN ? 'Toate cererile' : 'Cererile mele'}
                                </Link>
                            </div>
                        </>
                    )}
                    {user.isAuthenticated && user.rol === ROLURI.ADMIN && (
                        <div className="articolMeniu">
                            <Link to="/admin">Administrare sistem</Link>
                        </div>
                    )}

                    {isMr && (
                        <>
                            <div className="articolMeniu">
                                <Link to="/cereri">Cereri</Link>
                            </div>
                            {isMrOnly ? <MeniuAdministrarePosturi /> : null}
                        </>
                    )}

                    {user.isAuthenticated && user.rol !== ROLURI.GUEST && (
                        <div className="articolMeniu">
                            <Link to="/dashboard">Dashboard</Link>
                        </div>
                    )}
                    {user.isAuthenticated && user.rol === ROLURI.GUEST && (
                        <div className="articolMeniu">
                            <Link to="/cont-in-asteptare">Cont în așteptare</Link>
                        </div>
                    )}
                </div>
                <div className="grupLogin">
                    <MeniuLogin />
                </div>
            </div>
        </nav>
    )
}