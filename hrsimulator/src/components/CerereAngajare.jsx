import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import LoginContext from '../context/login_context'
import './CerereAngajare.css'

const INTERVIEVATORI_DISPONIBILI = [{ id: 'itest', label: 'itest (Intervievator tehnic)' }]

export default function CerereAngajare({ onTrimite, departament = '' }) {
    const navigate = useNavigate()
    const { user } = useContext(LoginContext)
    const [numePost, setNumePost] = useState('')
    const [descriere, setDescriere] = useState('')
    const [nrPozitii, setNrPozitii] = useState(1)
    const [intervievatoriSelectati, setIntervievatoriSelectati] = useState([])

    const toggleIntervievator = (id) => {
        setIntervievatoriSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onTrimite({
            numePost: numePost.trim(),
            descriere: descriere.trim() || undefined,
            nrPozitii: Number(nrPozitii) || 1,
            departament: departament || 'Programare',
            intervievatoriTehnici: [...intervievatoriSelectati],
            createdBy: user?.nume || ''
        })
        navigate('/')
    }

    return (
        <div className="cerere-angajare">
            <h1>Cerere de angajare</h1>
            <p className="cerere-info">Completați cererea pentru a semnala necesitatea de recrutare. Descrierea și numărul de poziții pot fi completate și pe parcurs.</p>
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
                    <label htmlFor="cerere-descriere">Descrierea postului (opțional, se poate completa ulterior)</label>
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
                        {INTERVIEVATORI_DISPONIBILI.map((inv) => (
                            <label key={inv.id} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={intervievatoriSelectati.includes(inv.id)}
                                    onChange={() => toggleIntervievator(inv.id)}
                                />
                                {inv.label}
                            </label>
                        ))}
                    </div>
                </div>
                {departament && <p className="form-camp departament-info">Departament: <strong>{departament}</strong></p>}
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
