import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginContext from '../context/login_context'
import { getIntervievatoriTehnici, getRecrutori } from '../api/hrMetaApi'
import { createCerere } from '../api/cereriApi'
import './CerereAngajare.css'

export default function CerereAngajare({ token }) {
    const navigate = useNavigate()
    const { user } = useContext(LoginContext)
    const [numePost, setNumePost] = useState('')
    const [subdomeniu, setSubdomeniu] = useState('')
    const [descriereMod, setDescriereMod] = useState('MANUAL')
    const [descriere, setDescriere] = useState('')
    const [fisier, setFisier] = useState(null)
    const [nrPozitii, setNrPozitii] = useState(1)
    const [intervievatoriOpt, setIntervievatoriOpt] = useState([])
    const [recrutoriOpt, setRecrutoriOpt] = useState([])
    const [intervievatoriSelectati, setIntervievatoriSelectati] = useState([])
    const [recrutoriSelectati, setRecrutoriSelectati] = useState([])
    const [err, setErr] = useState('')

    useEffect(() => {
        if (!token) return
        Promise.all([
            getIntervievatoriTehnici(token).catch(() => []),
            getRecrutori(token).catch(() => []),
        ]).then(([i, r]) => {
            setIntervievatoriOpt(Array.isArray(i) ? i : [])
            setRecrutoriOpt(Array.isArray(r) ? r : [])
        })
    }, [token])

    const toggleIntervievator = (id) => {
        setIntervievatoriSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }
    const toggleRecrutor = (id) => {
        setRecrutoriSelectati((prev) =>
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
        if (descriereMod === 'MANUAL') {
            if (!descriere.trim()) {
                setErr('Introduceți descrierea postului sau alegeți încărcare fișier.')
                return
            }
        } else {
            if (!fisier) {
                setErr('Selectați un fișier .pdf sau .docx pentru descriere.')
                return
            }
        }
        try {
            await createCerere(token, {
                numePost: numePost.trim(),
                nrPozitii: Number(nrPozitii) || 1,
                departamentId: user.departamentId,
                subdomeniu: subdomeniu.trim() || undefined,
                descriereMod,
                descriere: descriereMod === 'MANUAL' ? descriere.trim() : descriere.trim() || undefined,
                intervievatoriTehniciIds: intervievatoriSelectati,
                recrutoriIds: recrutoriSelectati,
                file: descriereMod === 'FISIER' ? fisier : null,
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
                Completați cererea pentru a semnala necesitatea de recrutare. Domeniul este departamentul dumneavoastră;
                puteți indica un subdomeniu (ex. tehnologie sau rol). Descrierea poate fi text sau fișier PDF/DOCX.
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
                {user?.departament && (
                    <div className="form-camp">
                        <span className="label">Domeniu (departament)</span>
                        <input type="text" readOnly value={user.departament} className="input-readonly" />
                    </div>
                )}
                <div className="form-camp">
                    <label htmlFor="cerere-subdomeniu">Subdomeniu</label>
                    <input
                        id="cerere-subdomeniu"
                        type="text"
                        placeholder="ex. Backend, Frontend, Vânzări regionale"
                        value={subdomeniu}
                        onChange={(e) => setSubdomeniu(e.target.value)}
                    />
                </div>
                <div className="form-camp">
                    <span className="label">Descriere post *</span>
                    <div className="descriere-mod-uri" role="radiogroup" aria-label="Mod descriere">
                        <label className="radio-inline">
                            <input
                                type="radio"
                                name="descriereMod"
                                checked={descriereMod === 'MANUAL'}
                                onChange={() => {
                                    setDescriereMod('MANUAL')
                                    setFisier(null)
                                }}
                            />
                            Introducere manuală
                        </label>
                        <label className="radio-inline">
                            <input
                                type="radio"
                                name="descriereMod"
                                checked={descriereMod === 'FISIER'}
                                onChange={() => setDescriereMod('FISIER')}
                            />
                            Încarcă fișier (.pdf / .docx)
                        </label>
                    </div>
                    {descriereMod === 'MANUAL' ? (
                        <textarea
                            id="cerere-descriere"
                            rows={6}
                            value={descriere}
                            onChange={(e) => setDescriere(e.target.value)}
                            placeholder="Descrierea detaliată a postului…"
                            required
                        />
                    ) : (
                        <>
                            <input
                                id="cerere-fisier"
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) => setFisier(e.target.files?.[0] ?? null)}
                                className="input-file"
                            />
                            <p className="hint-file">Max. 10 MB. Formate acceptate: PDF, DOCX.</p>
                            <label htmlFor="cerere-note-fisier">Note suplimentare (opțional)</label>
                            <textarea
                                id="cerere-note-fisier"
                                rows={3}
                                value={descriere}
                                onChange={(e) => setDescriere(e.target.value)}
                                placeholder="Scurt rezumat sau note pentru HR…"
                            />
                        </>
                    )}
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
                <div className="form-camp">
                    <span className="label">Recrutori propuși (opțional)</span>
                    <div className="checkbox-list">
                        {recrutoriOpt.map((r) => (
                            <label key={r.id} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={recrutoriSelectati.includes(r.id)}
                                    onChange={() => toggleRecrutor(r.id)}
                                />
                                {r.numeUtilizator}
                            </label>
                        ))}
                    </div>
                </div>
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
