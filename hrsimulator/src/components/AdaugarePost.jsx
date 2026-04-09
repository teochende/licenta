import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdaugarePost.css'

export default function AdaugarePost({ posturi, onAdaugaPost }) {
    const navigate = useNavigate()
    const [domeniu, setDomeniu] = useState('')
    const [subdomeniu, setSubdomeniu] = useState('')
    const [nume, setNume] = useState('')
    const [nivel, setNivel] = useState('')
    const [descriere, setDescriere] = useState('')
    const [enabled, setEnabled] = useState(true)

    const urmatorulId = posturi.length > 0
        ? Math.max(...posturi.map((p) => p.id)) + 1
        : 1

    const handleSubmit = (e) => {
        e.preventDefault()
        const postNou = {
            id: urmatorulId,
            domeniu: domeniu.trim(),
            subdomeniu: subdomeniu.trim(),
            nume: nume.trim(),
            nivel: nivel.trim(),
            descriere: descriere.trim(),
            enabled,
        }
        onAdaugaPost(postNou)
        navigate('/administrare-posturi')
    }

    return (
        <>
            <h1>Adăugare post nou</h1>
            <form className="formular-adaugare-post" onSubmit={handleSubmit}>
                <div className="form-camp">
                    <label htmlFor="adaugare-domeniu">Domeniu</label>
                    <input
                        id="adaugare-domeniu"
                        type="text"
                        value={domeniu}
                        onChange={(e) => setDomeniu(e.target.value)}
                        required
                    />
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
                    <textarea
                        id="adaugare-descriere"
                        rows={4}
                        value={descriere}
                        onChange={(e) => setDescriere(e.target.value)}
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
                <p className="form-id-info">ID-ul va fi atribuit automat: <strong>{urmatorulId}</strong></p>
                <div className="form-butonuri">
                    <button type="button" className="btn btn-anulare" onClick={() => navigate('/administrare-posturi')}>
                        Anulare
                    </button>
                    <button type="submit" className="btn btn-salvare">
                        Adaugă post
                    </button>
                </div>
            </form>
        </>
    )
}
