import { useContext } from 'react'
import { Link, Navigate } from 'react-router-dom'
import LoginContext, { ROLURI } from '../context/login_context'

/** Pagină pentru utilizatorii cu rol guest după autentificare. */
export default function ContInAsteptare() {
    const { user, onLogout } = useContext(LoginContext)

    if (!user.isAuthenticated) {
        return <Navigate to="/login" replace />
    }
    if (user.rol !== ROLURI.GUEST) {
        return <Navigate to="/" replace />
    }

    return (
        <section className="cont-asteptare">
            <h2>Cont în așteptare</h2>
            <p>
                Contul dvs. ({user.email}) are rolul <strong>Invitat</strong>. Un administrator va valida solicitarea
                {user.rolDoritDenumire ? (
                    <>
                        {' '}
                        pentru rolul <strong>{user.rolDoritDenumire}</strong>
                    </>
                ) : null}{' '}
                și vă poate atribui departamentul dacă este cazul.
            </p>
            <p>Până atunci nu aveți acces la dashboard sau la fluxurile HR.</p>
            <p>
                <Link to="/" onClick={() => onLogout()}>
                    Deconectare
                </Link>
            </p>
        </section>
    )
}
