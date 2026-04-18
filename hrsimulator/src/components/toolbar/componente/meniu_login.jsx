import { Link } from 'react-router-dom'
import { useContext, useState, useEffect, useRef } from 'react'

import LoginContext, { ROLURI } from '../../../context/login_context'

function rolAfisare(cod) {
    const m = {
        [ROLURI.ADMIN]: 'Administrator',
        [ROLURI.MANAGER_RECRUTARE]: 'Manager recrutare',
        [ROLURI.MANAGER_DEPARTAMENT]: 'Manager departament',
        [ROLURI.RECRUTOR]: 'Recrutor',
        [ROLURI.INTERVIEVATOR_TEHNIC]: 'Intervievator tehnic',
        [ROLURI.GUEST]: 'Invitat (în așteptare)',
    }
    return m[cod] || cod || '—'
}

export default function MeniuLogin() {
    const { user, onLogout } = useContext(LoginContext)
    const nume = user.numeUtilizator || user.nume || ''
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const menuWrapRef = useRef(null)

    useEffect(() => {
        if (!userMenuOpen) return
        const onDocDown = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
                setUserMenuOpen(false)
            }
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setUserMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDocDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [userMenuOpen])

    return (
        <div className="toolbar-login-cluster">
            {user.isAuthenticated ? (
                <div className="toolbar-user-menu-wrap" ref={menuWrapRef}>
                    <button
                        type="button"
                        className="toolbar-user-trigger"
                        id="toolbar-user-menu-button"
                        aria-expanded={userMenuOpen}
                        aria-haspopup="menu"
                        aria-controls={userMenuOpen ? 'toolbar-user-dropdown' : undefined}
                        onClick={() => setUserMenuOpen((o) => !o)}
                    >
                        <span className="toolbar-user-trigger-top">
                            <span className="toolbar-user-name" title={nume || undefined}>
                                {nume || '—'}
                            </span>
                            <span className="toolbar-user-trigger-chevron" aria-hidden />
                        </span>
                        <span className="toolbar-user-role">{rolAfisare(user.rol)}</span>
                    </button>
                    {userMenuOpen ? (
                        <div
                            id="toolbar-user-dropdown"
                            className="toolbar-user-dropdown"
                            role="menu"
                            aria-labelledby="toolbar-user-menu-button"
                        >
                            <Link
                                role="menuitem"
                                to="/"
                                className="toolbar-user-dropdown-item"
                                onClick={() => {
                                    setUserMenuOpen(false)
                                    onLogout()
                                }}
                            >
                                Deconectare
                            </Link>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="articolMeniu articolMeniu-login-register">
                    <Link to="/login">Login</Link>
                    <span aria-hidden> · </span>
                    <Link to="/register">Înregistrare</Link>
                </div>
            )}
        </div>
    )
}
