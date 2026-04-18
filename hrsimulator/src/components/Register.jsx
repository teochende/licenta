import { useState } from 'react'
import { Link } from 'react-router-dom'
import './auth_pages.css'

/** Valori enum backend (RegisterPublicRequestDTO.rolDorit) — fără ADMIN / GUEST. */
const ROLURI_INREGISTRARE = [
    { cod: 'INTERVIEVATOR_TEHNIC', label: 'Intervievator tehnic' },
    { cod: 'RECRUTOR', label: 'Recrutor' },
    { cod: 'MANAGER_RECRUTARE', label: 'Manager recrutare' },
    { cod: 'MANAGER_DEPARTAMENT', label: 'Manager departament' },
]

/**
 * @param {{ onRegistered: (data: { numeUtilizator: string, email: string, parola: string, rolDorit: string }) => Promise<void> }} props
 */
export default function Register({ onRegistered }) {
    const [numeUtilizator, setNumeUtilizator] = useState('')
    const [email, setEmail] = useState('')
    const [parola, setParola] = useState('')
    const [rolDorit, setRolDorit] = useState('RECRUTOR')
    const [infoform, setInfoForm] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setInfoForm('')
        setLoading(true)
        try {
            await onRegistered({
                numeUtilizator: numeUtilizator.trim(),
                email: email.trim(),
                parola,
                rolDorit,
            })
            setNumeUtilizator('')
            setEmail('')
            setParola('')
        } catch (e) {
            setInfoForm(e?.message || 'Eroare la înregistrare.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <h3>Înregistrare</h3>
            <p>
                Doar adrese <strong>@hrsim.ro</strong>. Veți primi rolul <strong>Invitat</strong> până la validarea de către un
                administrator; rolul ales mai jos este doar o solicitare.
            </p>
            <form onSubmit={handleSubmit}>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor="reg_user">Nume utilizator</label>
                            </td>
                            <td>
                                <input
                                    id="reg_user"
                                    name="numeUtilizator"
                                    value={numeUtilizator}
                                    minLength={3}
                                    maxLength={64}
                                    required
                                    autoComplete="username"
                                    onChange={(e) => setNumeUtilizator(e.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="reg_email">Email @hrsim.ro</label>
                            </td>
                            <td>
                                <input
                                    type="email"
                                    id="reg_email"
                                    name="email"
                                    value={email}
                                    required
                                    autoComplete="email"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="reg_pass">Parolă</label>
                            </td>
                            <td>
                                <input
                                    type="password"
                                    id="reg_pass"
                                    name="password"
                                    value={parola}
                                    minLength={8}
                                    required
                                    autoComplete="new-password"
                                    onChange={(e) => setParola(e.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="reg_rol">Rol solicitat</label>
                            </td>
                            <td>
                                <select
                                    id="reg_rol"
                                    value={rolDorit}
                                    onChange={(e) => setRolDorit(e.target.value)}
                                >
                                    {ROLURI_INREGISTRARE.map((r) => (
                                        <option key={r.cod} value={r.cod}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td>
                                <input
                                    type="submit"
                                    value={loading ? 'Se creează contul…' : 'Înregistrare'}
                                    disabled={loading || !numeUtilizator || !email || !parola}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
            {infoform && <p className="auth-alert">{infoform}</p>}
            <p className="auth-footer-note">
                <Link to="/login">Înapoi la autentificare</Link>
            </p>
        </div>
    )
}
