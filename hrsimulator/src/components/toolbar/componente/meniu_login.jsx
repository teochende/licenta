import { Link } from 'react-router-dom'
import { useContext } from 'react'

import LoginContext, { ROLURI } from '../../../context/login_context'

function rolAfisare(cod) {
    const m = {
        [ROLURI.ADMIN]: 'Administrator',
        [ROLURI.MANAGER_RECRUTARE]: 'Manager recrutare',
        [ROLURI.MANAGER_DEPARTAMENT]: 'Manager departament',
        [ROLURI.RECRUTOR]: 'Recrutor',
        [ROLURI.INTERVIEVATOR_TEHNIC]: 'Intervievator tehnic',
    }
    return m[cod] || cod || '—'
}

export default function MeniuLogin() {
    const { user, onLogout } = useContext(LoginContext)
    const nume = user.numeUtilizator || user.nume || ''

    return (
        <div className="grupLogin">
            {user.isAuthenticated ? (
                <>
                    <div className="toolbar-user" aria-live="polite">
                        <span className="toolbar-user-name">{nume}</span>
                        <span className="toolbar-user-role">{rolAfisare(user.rol)}</span>
                    </div>
                    <div className="articolMeniu articolMeniu-logout">
                        <Link
                            to="/"
                            onClick={() => {
                                onLogout()
                            }}
                        >
                            LogOut
                        </Link>
                    </div>
                </>
            ) : (
                <div className="articolMeniu">
                    <Link to="/login">Login</Link>
                </div>
            )}
        </div>
    )
}
