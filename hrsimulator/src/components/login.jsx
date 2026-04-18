import { useState } from 'react'
import { Link } from 'react-router-dom'
import './auth_pages.css'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [parola, setParola] = useState('')
    const [infoform, setInfoForm] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin(event) {
        event.preventDefault()
        setInfoForm('')
        setLoading(true)
        try {
            const ok = await onLogin(email.trim(), parola)
            if (!ok) {
                setInfoForm('Email sau parolă greșite.')
            } else {
                setEmail('')
                setParola('')
            }
        } catch (e) {
            setInfoForm(e?.message || 'Eroare la autentificare.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <h3>Login</h3>
            <p>Folosiți emailul @hrsim.ro. Nu aveți cont? <Link to="/register">Înregistrare</Link></p>
            <form onSubmit={handleLogin}>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor="id_email">Email</label>
                            </td>
                            <td>
                                <input
                                    type="email"
                                    name="email"
                                    id="id_email"
                                    value={email}
                                    autoComplete="username"
                                    onChange={(event) => setEmail(event.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="id_pass">Parolă</label>
                            </td>
                            <td>
                                <input
                                    type="password"
                                    name="password"
                                    id="id_pass"
                                    value={parola}
                                    autoComplete="current-password"
                                    onChange={(event) => setParola(event.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td />
                            <td>
                                <input
                                    value={loading ? 'Se conectează…' : 'Trimite'}
                                    type="submit"
                                    disabled={loading || !email || !parola}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
            {infoform && <p className="auth-alert">{infoform}</p>}
        </div>
    )
}
