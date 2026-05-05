import { useState, useEffect } from 'react'
import { getIntervievatoriTehnici, getRecrutori } from '../api/hrMetaApi'
import { createCerere } from '../api/cereriApi'
import './CerereAngajare.css'

/**
 * Creare cerere de angajare de către administrator: alege departamentul (domeniu),
 * intervievatori tehnici și recrutori propuși.
 */
export default function AdminCerereAngajare({ token, departamente = [], onCreated }) {
    const [departamentId, setDepartamentId] = useState('')
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
    const [saving, setSaving] = useState(false)

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
        if (!departamentId) {
            setErr('Selectați departamentul (domeniu).')
            return
        }
        if (descriereMod === 'MANUAL') {
            if (!descriere.trim()) {
                setErr('Introduceți descrierea postului sau alegeți încărcare fișier.')
                return
            }
        } else if (!fisier) {
            setErr('Selectați un fișier .pdf sau .docx pentru descriere.')
            return
        }
        setSaving(true)
        try {
            await createCerere(token, {
                numePost: numePost.trim(),
                nrPozitii: Number(nrPozitii) || 1,
                departamentId: Number(departamentId),
                subdomeniu: subdomeniu.trim() || undefined,
                descriereMod,
                descriere: descriereMod === 'MANUAL' ? descriere.trim() : descriere.trim() || undefined,
                intervievatoriTehniciIds: intervievatoriSelectati,
                recrutoriIds: recrutoriSelectati,
                file: descriereMod === 'FISIER' ? fisier : null,
            })
            setNumePost('')
            setSubdomeniu('')
            setDescriere('')
            setFisier(null)
            setNrPozitii(1)
            setIntervievatoriSelectati([])
            setRecrutoriSelectati([])
            onCreated?.()
        } catch (ex) {
            setErr(ex?.message || 'Eroare la trimiterea cererii.')
        } finally {
            setSaving(false)
        }
    }

    const depNume = departamente.find((d) => String(d.id) === String(departamentId))?.nume

    return (
        <section className="admin-section" aria-labelledby="admin-cerere-heading">
            <div className="admin-section__head">
                <h2 id="admin-cerere-heading" className="admin-section__title">
                    Cerere de angajare (admin)
                </h2>
                <p className="admin-section__desc">
                    Creați o cerere pentru orice departament și atribuiți intervievatori tehnici și recrutori propuși.
                    Cererea poate fi editată ulterior de managerul HR sau managerul departamentului respectiv.
                </p>
            </div>
            <div className="admin-card cerere-angajare">
                {err && <p className="admin-alert admin-alert--error" style={{ marginBottom: '1rem' }}>{err}</p>}
                <form className="formular-cerere" onSubmit={handleSubmit}>
                    <div className="form-camp">
                        <label htmlFor="admin-cerere-dep">Departament (domeniu) *</label>
                        <select
                            id="admin-cerere-dep"
                            className="ui-select"
                            value={departamentId}
                            onChange={(e) => setDepartamentId(e.target.value)}
                            required
                        >
                            <option value="">— Selectați —</option>
                            {departamente.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.nume}
                                </option>
                            ))}
                        </select>
                    </div>
                    {depNume && (
                        <p className="departament-info" style={{ marginTop: 0 }}>
                            Domeniu selectat: <strong>{depNume}</strong>
                        </p>
                    )}
                    <div className="form-camp">
                        <label htmlFor="admin-cerere-nume">Nume post *</label>
                        <input
                            id="admin-cerere-nume"
                            type="text"
                            value={numePost}
                            onChange={(e) => setNumePost(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-camp">
                        <label htmlFor="admin-cerere-sub">Subdomeniu</label>
                        <input
                            id="admin-cerere-sub"
                            type="text"
                            value={subdomeniu}
                            onChange={(e) => setSubdomeniu(e.target.value)}
                            placeholder="ex. Backend, Vânzări"
                        />
                    </div>
                    <div className="form-camp">
                        <span className="label">Descriere post *</span>
                        <div className="descriere-mod-uri" role="radiogroup">
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="adminDescriereMod"
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
                                    name="adminDescriereMod"
                                    checked={descriereMod === 'FISIER'}
                                    onChange={() => setDescriereMod('FISIER')}
                                />
                                Încarcă fișier (.pdf / .docx)
                            </label>
                        </div>
                        {descriereMod === 'MANUAL' ? (
                            <textarea
                                rows={6}
                                value={descriere}
                                onChange={(e) => setDescriere(e.target.value)}
                                required
                            />
                        ) : (
                            <>
                                <input
                                    type="file"
                                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={(e) => setFisier(e.target.files?.[0] ?? null)}
                                    className="input-file"
                                />
                                <p className="hint-file">Max. 10 MB.</p>
                                <label>Note suplimentare (opțional)</label>
                                <textarea rows={3} value={descriere} onChange={(e) => setDescriere(e.target.value)} />
                            </>
                        )}
                    </div>
                    <div className="form-camp">
                        <label htmlFor="admin-cerere-poz">Număr poziții</label>
                        <input
                            id="admin-cerere-poz"
                            type="number"
                            min={1}
                            value={nrPozitii}
                            onChange={(e) => setNrPozitii(e.target.value)}
                        />
                    </div>
                    <div className="form-camp">
                        <span className="label">Intervievatori tehnici</span>
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
                        <span className="label">Recrutori propuși</span>
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
                        <button type="submit" className="btn btn-trimite" disabled={saving}>
                            {saving ? 'Se trimite…' : 'Trimite cererea'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    )
}
