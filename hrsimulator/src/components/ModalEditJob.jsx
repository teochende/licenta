import { useState, useEffect, useMemo, useRef } from 'react'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './ModalEditJob.css'

function normalizePerson(p, roleFallback) {
    if (!p) return null
    if (typeof p === 'string') {
        const username = String(p)
        const role = roleFallback || ''
        const searchText = `${username} ${role}`.trim().toLowerCase()
        return { username, email: '', role, searchText }
    }
    const username = String(p.numeUtilizator || p.username || p.name || '').trim()
    if (!username) return null
    const email = String(p.email || '').trim()
    const role = String(p.rolCod || p.rol || roleFallback || '').trim()
    const searchText = `${username} ${email} ${role}`.trim().toLowerCase()
    return { username, email, role, searchText }
}

function PeoplePicker({
    title,
    roleFallback,
    people,
    selected,
    onToggleUsername,
    emptyHint,
    searchPlaceholder = 'Search',
}) {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')

    const normalized = useMemo(() => {
        const out = []
        ;(Array.isArray(people) ? people : []).forEach((p) => {
            const n = normalizePerson(p, roleFallback)
            if (n) out.push(n)
        })
        out.sort((a, b) => a.username.localeCompare(b.username))
        return out
    }, [people, roleFallback])

    const selectedSet = useMemo(() => new Set(Array.isArray(selected) ? selected : []), [selected])

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase()
        if (!qq) return normalized
        return normalized.filter((p) => p.searchText.includes(qq))
    }, [normalized, q])

    const chips = useMemo(() => normalized.filter((p) => selectedSet.has(p.username)), [normalized, selectedSet])

    return (
        <div className="modal-edit-picker">
            <button
                type="button"
                className="modal-edit-picker__head"
                onClick={() => setOpen((x) => !x)}
                aria-expanded={open}
            >
                <span className="modal-edit-picker__title">{title}</span>
                <span className="modal-edit-picker__count">{selectedSet.size}</span>
                <span className="modal-edit-picker__chev" aria-hidden="true">
                    ▾
                </span>
            </button>

            {selectedSet.size > 0 ? (
                <div className="modal-edit-chips" aria-label={`Selectați: ${title}`}>
                    {chips.map((p) => (
                        <span key={p.username} className="modal-edit-chip" title={p.email || p.role || p.username}>
                            <span className="modal-edit-chip__text">{p.username}</span>
                            <button
                                type="button"
                                className="modal-edit-chip__x"
                                onClick={() => onToggleUsername(p.username)}
                                aria-label={`Elimină ${p.username}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <p className="modal-edit-picker__empty">Nimeni selectat.</p>
            )}

            {open ? (
                normalized.length === 0 ? (
                    <p className="modal-edit-hint">{emptyHint}</p>
                ) : (
                    <div className="modal-edit-picker__panel">
                        <div className="modal-edit-picker__search">
                            <input
                                type="search"
                                className="modal-edit-picker__search-input"
                                placeholder={searchPlaceholder}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                aria-label={`Caută în ${title}`}
                                autoComplete="off"
                            />
                        </div>
                        <div className="modal-edit-picker__list" role="listbox" aria-label={title}>
                            {filtered.length === 0 ? (
                                <div className="modal-edit-picker__nope">Niciun rezultat.</div>
                            ) : (
                                filtered.map((p) => {
                                    const checked = selectedSet.has(p.username)
                                    return (
                                        <button
                                            key={p.username}
                                            type="button"
                                            className={`modal-edit-picker__row${checked ? ' modal-edit-picker__row--checked' : ''}`}
                                            onClick={() => onToggleUsername(p.username)}
                                            role="option"
                                            aria-selected={checked}
                                        >
                                            <span className="modal-edit-picker__row-main">
                                                <span className="modal-edit-picker__row-name">{p.username}</span>
                                                {p.email || p.role ? (
                                                    <span className="modal-edit-picker__row-sub">
                                                        {[p.email, p.role].filter(Boolean).join(' · ')}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="modal-edit-picker__row-check" aria-hidden="true">
                                                {checked ? '✓' : ''}
                                            </span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )
            ) : null}
        </div>
    )
}

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
                nrPozitii: job.nrPozitii ?? 1,
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
            nrPozitii: Number(formData.nrPozitii) || 1,
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
                <div
                    className="modal-edit-job modal-edit-job--wide"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Editare job"
                >
                    <div className="modal-edit-head">
                        <div className="modal-edit-head__text">
                            <h2 className="modal-edit-head__title">Editare job</h2>
                            <p className="modal-edit-head__subtitle">Se încarcă departamentele…</p>
                        </div>
                        <button type="button" className="modal-edit-head__close" onClick={onClose} aria-label="Închide">
                            ×
                        </button>
                    </div>
                    <div className="modal-edit-body">
                        <p className="modal-edit-loading">Se încarcă departamentele…</p>
                    </div>
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
            <div
                className="modal-edit-job modal-edit-job--wide"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Editare job"
            >
                <div className="modal-edit-head">
                    <div className="modal-edit-head__text">
                        <h2 className="modal-edit-head__title">Editare job</h2>
                        <p className="modal-edit-head__subtitle">
                            #{formData.id} · {formData.nume}
                        </p>
                    </div>
                    <button type="button" className="modal-edit-head__close" onClick={onClose} aria-label="Închide">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-edit-form">
                    <div className="modal-edit-body">
                        <div className="modal-edit-grid">
                            <div className="modal-edit-camp">
                                <label htmlFor="edit-id">ID</label>
                                <input id="edit-id" type="number" value={formData.id} readOnly disabled />
                            </div>
                            <div className="modal-edit-camp">
                                <label htmlFor="edit-departament">Departament</label>
                                <select
                                    id="edit-departament"
                                    className="ui-select"
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
                                <label htmlFor="edit-nr-pozitii">Nr. poziții</label>
                                <input
                                    id="edit-nr-pozitii"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={formData.nrPozitii ?? 1}
                                    onChange={(e) => handleChange('nrPozitii', e.target.value)}
                                    required
                                />
                                <p className="modal-edit-hint">
                                    Poziții libere se calculează automat din pipeline (Ofertă + Admis).
                                </p>
                            </div>
                        </div>

                        <div className="modal-edit-camp">
                            <label htmlFor="edit-descriere">Descriere (text)</label>
                            <JobDescriereSectiuniHint className="modal-edit-hint" />
                            <textarea
                                id="edit-descriere"
                                rows={6}
                                value={formData.descriere ?? ''}
                                onChange={(e) => handleChange('descriere', e.target.value)}
                                placeholder="Opțional dacă atașați PDF/DOCX — altfel completați aici cu toate secțiunile obligatorii."
                            />
                        </div>

                        <div className="modal-edit-camp modal-edit-fisier-descriere">
                            <label htmlFor="edit-descriere-fisier">Descriere ca fișier (PDF sau DOCX)</label>
                            <JobDescriereSectiuniHint className="modal-edit-hint" compact />
                            <div className="modal-edit-upload">
                                <input
                                    ref={fisierInputRef}
                                    id="edit-descriere-fisier"
                                    className="modal-edit-upload__input"
                                    type="file"
                                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={onFisierChange}
                                />
                                <label className="modal-edit-upload__btn" htmlFor="edit-descriere-fisier">
                                    <svg
                                        className="modal-edit-upload__icon"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <path d="M7 10l5-5 5 5" />
                                        <path d="M12 5v14" />
                                    </svg>
                                    Browse
                                </label>
                                <div className="modal-edit-upload__meta" aria-live="polite">
                                    {descriereFisierFile ? `Selectat: ${descriereFisierFile.name}` : 'Niciun fișier selectat'}
                                </div>
                            </div>
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
                        <PeoplePicker
                            title="Recrutori atribuiți"
                            roleFallback="RECRUTOR"
                            people={recrutoriDisponibili}
                            selected={formData.assignedRecrutori || []}
                            onToggleUsername={toggleRecrutor}
                            emptyHint="Nu există utilizatori cu rol recrutor sau lista nu s-a încărcat. Creați utilizatori recrutori în administrare."
                        />
                    </div>
                    <div className="modal-edit-camp modal-edit-atribuiri">
                        <PeoplePicker
                            title="Intervievatori tehnici atribuiți"
                            roleFallback="INTERVIEVATOR_TEHNIC"
                            people={intervievatoriDisponibili}
                            selected={formData.assignedIntervievatori || []}
                            onToggleUsername={toggleIntervievator}
                            emptyHint="Nu există intervievatori tehnici sau lista nu s-a încărcat."
                        />
                    </div>
                    </div>
                    <div className="modal-edit-butonuri">
                        <button type="button" className="modal-btn modal-btn-anulare" onClick={onClose}>
                            Anulează
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
