import { useState, useEffect, useRef } from 'react'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './ModalEditJob.css'

export default function ModalEditJob({
    job,
    token,
    onSave,
    onClose,
    departamente = [],
    recrutoriDisponibili = [],
    intervievatoriDisponibili = [],
}) {
    const [formData, setFormData] = useState(null)
    const [descriereFisierFile, setDescriereFisierFile] = useState(null)
    const [stergeDescriereFisier, setStergeDescriereFisier] = useState(false)
    const fisierInputRef = useRef(null)

    useEffect(() => {
        if (job) {
            setFormData({
                ...job,
                departamentId: job.departamentId ?? '',
                assignedRecrutori: Array.isArray(job.assignedRecrutori) ? [...job.assignedRecrutori] : [],
                assignedIntervievatori: Array.isArray(job.assignedIntervievatori)
                    ? [...job.assignedIntervievatori]
                    : [],
            })
            setDescriereFisierFile(null)
            setStergeDescriereFisier(false)
            if (fisierInputRef.current) fisierInputRef.current.value = ''
        }
    }, [job])

    const handleChange = (camp, valoare) => {
        setFormData((prev) => (prev ? { ...prev, [camp]: valoare } : null))
    }

    const toggleRecrutor = (username) => {
        setFormData((prev) => {
            if (!prev) return prev
            const list = prev.assignedRecrutori || []
            const next = list.includes(username) ? list.filter((u) => u !== username) : [...list, username]
            return { ...prev, assignedRecrutori: next }
        })
    }

    const toggleIntervievator = (username) => {
        setFormData((prev) => {
            if (!prev) return prev
            const list = prev.assignedIntervievatori || []
            const next = list.includes(username) ? list.filter((u) => u !== username) : [...list, username]
            return { ...prev, assignedIntervievatori: next }
        })
    }

    const handleOpenFisierCurent = async () => {
        if (!token || !job?.id || !job?.descriereFisierStocat) return
        try {
            const res = await fetch(`/api/posturi/${job.id}/descriere-fisier`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const t = await res.text()
                throw new Error(t || res.statusText)
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank', 'noopener,noreferrer')
            setTimeout(() => URL.revokeObjectURL(url), 120000)
        } catch (e) {
            window.alert(e?.message || 'Nu s-a putut deschide fișierul.')
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData) return
        const textDesc = (formData.descriere != null ? String(formData.descriere) : '').trim()
        if (textDesc !== '') {
            const { ok, missing } = validateJobDescriereSections(textDesc)
            if (!ok) {
                window.alert(
                    `Descrierea (text) trebuie să conțină toate secțiunile obligatorii. Lipsesc: ${missing.join(', ')}.`
                )
                return
            }
        }
        onSave({
            ...formData,
            id: Number(formData.id),
            departamentId: Number(formData.departamentId),
            assignedRecrutori: formData.assignedRecrutori || [],
            assignedIntervievatori: formData.assignedIntervievatori || [],
            descriereFisierFile: stergeDescriereFisier ? null : descriereFisierFile,
            stergeDescriereFisier,
        })
    }

    const onFisierChange = (e) => {
        const f = e.target.files?.[0]
        setDescriereFisierFile(f || null)
        if (f) setStergeDescriereFisier(false)
    }

    const eliminaFisier = () => {
        setStergeDescriereFisier(true)
        setDescriereFisierFile(null)
        if (fisierInputRef.current) fisierInputRef.current.value = ''
    }

    if (!job || !formData) return null

    if (departamente.length === 0) {
        return (
            <div className="modal-edit-overlay" onClick={onClose} role="presentation">
                <div className="modal-edit-job modal-edit-job--wide" onClick={(e) => e.stopPropagation()}>
                    <p>Se încarcă departamentele…</p>
                    <div className="modal-edit-butonuri">
                        <button type="button" className="modal-btn modal-btn-anulare" onClick={onClose}>
                            Închide
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const areFisierPeServer = job.descriereFisierStocat && !stergeDescriereFisier

    return (
        <div className="modal-edit-overlay" onClick={onClose} role="presentation">
            <div className="modal-edit-job modal-edit-job--wide" onClick={(e) => e.stopPropagation()}>
                <h2>Editare job</h2>
                <form onSubmit={handleSubmit}>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-id">ID</label>
                        <input id="edit-id" type="number" value={formData.id} readOnly disabled />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-departament">Departament</label>
                        <select
                            id="edit-departament"
                            value={formData.departamentId === '' ? '' : String(formData.departamentId)}
                            onChange={(e) => handleChange('departamentId', e.target.value ? Number(e.target.value) : '')}
                            required
                        >
                            {departamente.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.nume}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-subdomeniu">Subdomeniu</label>
                        <input
                            id="edit-subdomeniu"
                            type="text"
                            value={formData.subdomeniu}
                            onChange={(e) => handleChange('subdomeniu', e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-nume">Nume</label>
                        <input
                            id="edit-nume"
                            type="text"
                            value={formData.nume}
                            onChange={(e) => handleChange('nume', e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-nivel">Nivel</label>
                        <input
                            id="edit-nivel"
                            type="text"
                            value={formData.nivel}
                            onChange={(e) => handleChange('nivel', e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-descriere">Descriere (text)</label>
                        <JobDescriereSectiuniHint className="modal-edit-hint" />
                        <textarea
                            id="edit-descriere"
                            rows={4}
                            value={formData.descriere ?? ''}
                            onChange={(e) => handleChange('descriere', e.target.value)}
                            placeholder="Opțional dacă atașați PDF/DOCX — altfel completați aici cu toate secțiunile obligatorii."
                        />
                    </div>
                    <div className="modal-edit-camp modal-edit-fisier-descriere">
                        <label htmlFor="edit-descriere-fisier">Descriere ca fișier (PDF sau DOCX)</label>
                        <JobDescriereSectiuniHint className="modal-edit-hint" compact />
                        <input
                            ref={fisierInputRef}
                            id="edit-descriere-fisier"
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={onFisierChange}
                        />
                        {areFisierPeServer && (
                            <div className="modal-edit-fisier-actiuni">
                                <span className="modal-edit-fisier-nume">
                                    Fișier curent: {job.descriereFisierNume || '—'}
                                </span>
                                <button type="button" className="modal-btn modal-btn-link" onClick={handleOpenFisierCurent}>
                                    Deschide fișierul
                                </button>
                                <button type="button" className="modal-btn modal-btn-link modal-btn-danger" onClick={eliminaFisier}>
                                    Elimină fișierul salvat
                                </button>
                            </div>
                        )}
                        {descriereFisierFile && (
                            <p className="modal-edit-fisier-preview">Se va încărca: {descriereFisierFile.name}</p>
                        )}
                    </div>
                    <div className="modal-edit-camp modal-edit-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                            />
                            Post activ (enabled)
                        </label>
                    </div>
                    <div className="modal-edit-camp modal-edit-atribuiri">
                        <span className="modal-edit-label">Recruteri atribuiți</span>
                        {recrutoriDisponibili.length === 0 ? (
                            <p className="modal-edit-hint">
                                Nu există utilizatori cu rol recrutor sau lista nu s-a încărcat. Creați utilizatori recrutori
                                în administrare.
                            </p>
                        ) : (
                            <div className="modal-edit-checkbox-list">
                                {recrutoriDisponibili.map((u) => (
                                    <label key={u} className="modal-edit-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={(formData.assignedRecrutori || []).includes(u)}
                                            onChange={() => toggleRecrutor(u)}
                                        />
                                        {u}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-edit-camp modal-edit-atribuiri">
                        <span className="modal-edit-label">Intervievatori tehnici atribuiți</span>
                        {intervievatoriDisponibili.length === 0 ? (
                            <p className="modal-edit-hint">
                                Nu există intervievatori tehnici sau lista nu s-a încărcat.
                            </p>
                        ) : (
                            <div className="modal-edit-checkbox-list">
                                {intervievatoriDisponibili.map((u) => (
                                    <label key={u} className="modal-edit-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={(formData.assignedIntervievatori || []).includes(u)}
                                            onChange={() => toggleIntervievator(u)}
                                        />
                                        {u}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-edit-butonuri">
                        <button type="button" className="modal-btn modal-btn-anulare" onClick={onClose}>
                            Anulare
                        </button>
                        <button type="submit" className="modal-btn modal-btn-salvare">
                            Salvează
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
