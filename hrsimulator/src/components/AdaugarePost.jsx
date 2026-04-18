import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDepartamente } from '../api/departamenteApi'
import { createPost } from '../api/postsApi'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './AdaugarePost.css'

export default function AdaugarePost({ token, onCreated }) {
    const navigate = useNavigate()
    const [departamente, setDepartamente] = useState([])
    const [departamentId, setDepartamentId] = useState('')
    const [subdomeniu, setSubdomeniu] = useState('')
    const [nume, setNume] = useState('')
    const [nivel, setNivel] = useState('')
    const [descriere, setDescriere] = useState('')
    const [enabled, setEnabled] = useState(true)
    const [err, setErr] = useState('')

    useEffect(() => {
        if (!token) return
        getDepartamente(token)
            .then((rows) => {
                setDepartamente(Array.isArray(rows) ? rows : [])
                if (rows?.length && !departamentId) {
                    setDepartamentId(String(rows[0].id))
                }
            })
            .catch(() => setDepartamente([]))
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErr('')
        const descTrim = descriere.trim()
        if (descTrim !== '') {
            const { ok, missing } = validateJobDescriereSections(descTrim)
            if (!ok) {
                setErr(
                    `Descrierea trebuie să conțină toate secțiunile obligatorii. Lipsesc: ${missing.join(', ')}.`
                )
                return
            }
        }
        try {
            await createPost(token, {
                departamentId: Number(departamentId),
                subdomeniu: subdomeniu.trim(),
                nume: nume.trim(),
                nivel: nivel.trim(),
                descriere: descTrim,
                enabled,
                recrutoriIds: [],
                intervievatoriIds: [],
            })
            onCreated?.()
            navigate('/administrare-posturi')
        } catch (ex) {
            setErr(ex?.message || 'Nu s-a putut crea postul.')
        }
    }

    return (
        <div className="pagina-adaugare-post">
            <h1 className="pagina-adaugare-post__titlu">Adăugare post nou</h1>
            {err && <p className="adaugare-post-alert">{err}</p>}
            <form className="formular-adaugare-post" onSubmit={handleSubmit}>
                <div className="form-camp">
                    <label htmlFor="adaugare-dep">Departament</label>
                    <select
                        id="adaugare-dep"
                        value={departamentId}
                        onChange={(e) => setDepartamentId(e.target.value)}
                        required
                    >
                        {departamente.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.nume}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-camp">
                    <label htmlFor="adaugare-subdomeniu">Subdomeniu</label>
                    <input
                        id="adaugare-subdomeniu"
                        type="text"
                        value={subdomeniu}
                        onChange={(e) => setSubdomeniu(e.target.value)}
                        required
                    />
                </div>
                <div className="form-camp">
                    <label htmlFor="adaugare-nume">Nume post</label>
                    <input
                        id="adaugare-nume"
                        type="text"
                        value={nume}
                        onChange={(e) => setNume(e.target.value)}
                        required
                    />
                </div>
                <div className="form-camp">
                    <label htmlFor="adaugare-nivel">Nivel</label>
                    <input
                        id="adaugare-nivel"
                        type="text"
                        value={nivel}
                        onChange={(e) => setNivel(e.target.value)}
                        placeholder="ex. Junior, Intermediar, Senior"
                        required
                    />
                </div>
                <div className="form-camp">
                    <label htmlFor="adaugare-descriere">Descriere</label>
                    <JobDescriereSectiuniHint className="form-hint-descriere-structura" />
                    <textarea
                        id="adaugare-descriere"
                        rows={4}
                        value={descriere}
                        onChange={(e) => setDescriere(e.target.value)}
                        placeholder="Opțional la creare — puteți adăuga ulterior text sau fișier din administrare."
                    />
                </div>
                <div className="form-camp form-checkbox">
                    <label>
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        Post activ (enabled)
                    </label>
                </div>
                <div className="form-butonuri">
                    <button type="button" className="btn btn-anulare" onClick={() => navigate('/administrare-posturi')}>
                        Anulare
                    </button>
                    <button type="submit" className="btn btn-salvare">
                        Adaugă post
                    </button>
                </div>
            </form>
        </div>
    )
}
