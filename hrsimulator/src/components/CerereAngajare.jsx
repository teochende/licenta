import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginContext from '../context/login_context'
import { getIntervievatoriTehnici } from '../api/hrMetaApi'
import { createCerere } from '../api/cereriApi'
import './CerereAngajare.css'

export default function CerereAngajare({ token }) {
    const navigate = useNavigate()
    const { user } = useContext(LoginContext)
    const [numePost, setNumePost] = useState('')
    const [descriere, setDescriere] = useState('')
    const [nrPozitii, setNrPozitii] = useState(1)
    const [intervievatoriOpt, setIntervievatoriOpt] = useState([])
    const [intervievatoriSelectati, setIntervievatoriSelectati] = useState([])
    const [err, setErr] = useState('')

    useEffect(() => {
        if (!token) return
        getIntervievatoriTehnici(token)
            .then((rows) => setIntervievatoriOpt(Array.isArray(rows) ? rows : []))
            .catch(() => setIntervievatoriOpt([]))
    }, [token])

    const toggleIntervievator = (id) => {
        setIntervievatoriSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErr('')
        if (!user?.departamentId) {
            setErr('Contul nu are departament atribuit.')
            return
        }
        try {
            await createCerere(token, {
                numePost: numePost.trim(),
                descriere: descriere.trim() || null,
                nrPozitii: Number(nrPozitii) || 1,
                departamentId: user.departamentId,
                status: 'pending',
                creatDeUtilizatorId: null,
                postDeschisId: null,
                intervievatoriTehniciIds: intervievatoriSelectati,
            })
            navigate('/')
        } catch (ex) {
            setErr(ex?.message || 'Eroare la trimiterea cererii.')
        }
    }

    return (
        <div className="cerere-angajare">
            <h1>Cerere de angajare</h1>
            <p className="cerere-info">
                Completați cererea pentru a semnala necesitatea de recrutare. Descrierea și numărul de poziții pot fi
                completate și pe parcurs.
            </p>
            {err && <p style={{ color: 'crimson' }}>{err}</p>}
            <form className="formular-cerere" onSubmit={handleSubmit}>
                <div className="form-camp">
                    <label htmlFor="cerere-nume">Nume post *</label>
                    <input
                        id="cerere-nume"
                        type="text"
                        value={numePost}
                        onChange={(e) => setNumePost(e.target.value)}
                        required
                    />
                </div>
                <div className="form-camp">
                    <label htmlFor="cerere-descriere">Descrierea postului (opțional)</label>
                    <textarea
                        id="cerere-descriere"
                        rows={4}
                        value={descriere}
                        onChange={(e) => setDescriere(e.target.value)}
                    />
                </div>
                <div className="form-camp">
                    <label htmlFor="cerere-pozitii">Număr poziții libere</label>
                    <input
                        id="cerere-pozitii"
                        type="number"
                        min={1}
                        value={nrPozitii}
                        onChange={(e) => setNrPozitii(e.target.value)}
                    />
                </div>
                <div className="form-camp">
                    <span className="label">Intervievatori tehnici atribuiți</span>
                    <div className="checkbox-list">
                        {intervievatoriOpt.map((inv) => (
                            <label key={inv.id} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={intervievatoriSelectati.includes(inv.id)}
                                    onChange={() => toggleIntervievator(inv.id)}
                                />
                                {inv.numeUtilizator}
                            </label>
                        ))}
                    </div>
                </div>
                {user?.departament && (
                    <p className="form-camp departament-info">
                        Departament: <strong>{user.departament}</strong>
                    </p>
                )}
                <div className="form-butonuri">
                    <button type="button" className="btn btn-anulare" onClick={() => navigate('/')}>
                        Anulare
                    </button>
                    <button type="submit" className="btn btn-trimite">
                        Trimite cererea către managerul de recrutare
                    </button>
                </div>
            </form>
        </div>
    )
}
