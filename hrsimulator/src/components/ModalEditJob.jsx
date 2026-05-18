import { useState, useEffect, useMemo, useRef } from 'react'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './CereriList.css'
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
    searchPlaceholder = 'Caută…',
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
                                className="modal-edit-picker__search-input cereri-edit-input"
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

    const deptNume =
        departamente.find((d) => d.id === formData.departamentId)?.nume ||
        formData.departament ||
        '—'

    if (departamente.length === 0) {
        return (
            <div className="cereri-modal-overlay" onClick={onClose} role="presentation">
                <div
                    className="cereri-modal cereri-modal-wide cereri-edit-modal cereri-edit-modal--post"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="post-edit-title"
                >
                    <header className="cereri-edit-header">
                        <div className="cereri-edit-header-text">
                            <span className="cereri-edit-eyebrow">Editare post</span>
                            <h3 id="post-edit-title" className="cereri-edit-title">
                                {formData.nume?.trim() || 'Post'}
                            </h3>
                            <p className="cereri-edit-subtitle">Se încarcă departamentele…</p>
                        </div>
                    </header>
                    <div className="cereri-edit-scroll">
                        <p className="cereri-edit-section-hint">Se încarcă departamentele…</p>
                    </div>
                    <footer className="cereri-edit-footer">
                        <button type="button" className="btn btn-anulare" onClick={onClose}>
                            Închide
                        </button>
                    </footer>
                </div>
            </div>
        )
    }

    const areFisierPeServer = job.descriereFisierStocat && !stergeDescriereFisier

    return (
        <div className="cereri-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="cereri-modal cereri-modal-wide cereri-edit-modal cereri-edit-modal--post"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="post-edit-title"
            >
                <header className="cereri-edit-header">
                    <div className="cereri-edit-header-text">
                        <span className="cereri-edit-eyebrow">Editare post</span>
                        <h3 id="post-edit-title" className="cereri-edit-title">
                            {formData.nume?.trim() || 'Post'}
                        </h3>
                        <p className="cereri-edit-subtitle">
                            Referință <strong>#{formData.id}</strong> · {deptNume}
                            {formData.subdomeniu ? ` · ${formData.subdomeniu}` : ''}
                        </p>
                    </div>
                    <span
                        className="cerere-status-badge"
                        data-status={formData.enabled ? 'deschis' : 'rejected'}
                    >
                        {formData.enabled ? 'Activ' : 'Inactiv'}
                    </span>
                </header>

                <form className="cereri-edit-form" onSubmit={handleSubmit}>
                    <div className="cereri-edit-scroll">
                        <section className="cereri-edit-section" aria-labelledby="post-edit-sec-detalii">
                            <h4 id="post-edit-sec-detalii" className="cereri-edit-section-title">
                                Detalii post
                            </h4>
                            <div className="cereri-edit-grid">
                                <div className="cereri-edit-field cereri-edit-field--narrow">
                                    <label htmlFor="edit-id">ID</label>
                                    <input
                                        id="edit-id"
                                        className="cereri-edit-input"
                                        type="number"
                                        value={formData.id}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                <div className="cereri-edit-field">
                                    <label htmlFor="edit-departament">Departament</label>
                                    <select
                                        id="edit-departament"
                                        className="cereri-edit-select"
                                        value={
                                            formData.departamentId === ''
                                                ? ''
                                                : String(formData.departamentId)
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                'departamentId',
                                                e.target.value ? Number(e.target.value) : ''
                                            )
                                        }
                                        required
                                    >
                                        {departamente.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.nume}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="cereri-edit-field cereri-edit-field--full">
                                    <label htmlFor="edit-nume">Nume post</label>
                                    <input
                                        id="edit-nume"
                                        className="cereri-edit-input"
                                        type="text"
                                        value={formData.nume}
                                        onChange={(e) => handleChange('nume', e.target.value)}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="cereri-edit-field">
                                    <label htmlFor="edit-subdomeniu">Subdomeniu</label>
                                    <input
                                        id="edit-subdomeniu"
                                        className="cereri-edit-input"
                                        type="text"
                                        value={formData.subdomeniu}
                                        onChange={(e) => handleChange('subdomeniu', e.target.value)}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="cereri-edit-field">
                                    <label htmlFor="edit-nivel">Nivel</label>
                                    <input
                                        id="edit-nivel"
                                        className="cereri-edit-input"
                                        type="text"
                                        value={formData.nivel}
                                        onChange={(e) => handleChange('nivel', e.target.value)}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="cereri-edit-field cereri-edit-field--narrow">
                                    <label htmlFor="edit-nr-pozitii">Număr poziții</label>
                                    <input
                                        id="edit-nr-pozitii"
                                        className="cereri-edit-input cereri-edit-input--number"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={formData.nrPozitii ?? 1}
                                        onChange={(e) => handleChange('nrPozitii', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <p className="cereri-edit-section-hint">
                                Pozițiile libere se calculează automat din pipeline (Ofertă + Admis).
                            </p>
                        </section>

                        <section className="cereri-edit-section" aria-labelledby="post-edit-sec-desc">
                            <h4 id="post-edit-sec-desc" className="cereri-edit-section-title">
                                Descriere (text)
                            </h4>
                            <p className="cereri-edit-section-hint">
                                Opțional dacă atașați PDF/DOCX — altfel completați textul cu toate secțiunile
                                obligatorii.
                            </p>
                            <JobDescriereSectiuniHint className="cereri-edit-structura-hint" />
                            <div className="cereri-edit-field cereri-edit-field--full">
                                <label htmlFor="edit-descriere" className="visually-hidden">
                                    Descriere
                                </label>
                                <textarea
                                    id="edit-descriere"
                                    className="cereri-edit-textarea"
                                    rows={6}
                                    value={formData.descriere ?? ''}
                                    onChange={(e) => handleChange('descriere', e.target.value)}
                                    placeholder="Introduceți descrierea completă a postului…"
                                />
                            </div>
                        </section>

                        <section className="cereri-edit-section" aria-labelledby="post-edit-sec-fisier">
                            <h4 id="post-edit-sec-fisier" className="cereri-edit-section-title">
                                Descriere ca fișier
                            </h4>
                            <p className="cereri-edit-section-hint">
                                PDF sau DOCX — înlocuiește sau completează descrierea text.
                            </p>
                            <JobDescriereSectiuniHint className="cereri-edit-structura-hint" compact />
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
                                    Alege fișier
                                </label>
                                <div className="modal-edit-upload__meta" aria-live="polite">
                                    {descriereFisierFile
                                        ? `Selectat: ${descriereFisierFile.name}`
                                        : 'Niciun fișier selectat'}
                                </div>
                            </div>
                            {areFisierPeServer && (
                                <div className="modal-edit-fisier-actiuni">
                                    <span className="modal-edit-fisier-nume">
                                        Fișier curent: {job.descriereFisierNume || '—'}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={handleOpenFisierCurent}
                                    >
                                        Deschide fișierul
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-link btn-link--danger"
                                        onClick={eliminaFisier}
                                    >
                                        Elimină fișierul salvat
                                    </button>
                                </div>
                            )}
                            {descriereFisierFile && (
                                <p className="modal-edit-fisier-preview">
                                    Se va încărca: {descriereFisierFile.name}
                                </p>
                            )}
                        </section>

                        <section className="cereri-edit-section" aria-labelledby="post-edit-sec-setari">
                            <h4 id="post-edit-sec-setari" className="cereri-edit-section-title">
                                Setări
                            </h4>
                            <label
                                className={`cereri-edit-check${formData.enabled ? ' cereri-edit-check--on' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    className="cereri-edit-check-input"
                                    checked={formData.enabled}
                                    onChange={(e) => handleChange('enabled', e.target.checked)}
                                />
                                <span className="cereri-edit-check-ui" aria-hidden />
                                <span className="cereri-edit-check-label">
                                    Post activ (vizibil în recrutare)
                                </span>
                            </label>
                        </section>

                        <section className="cereri-edit-section" aria-labelledby="post-edit-sec-echipa">
                            <h4 id="post-edit-sec-echipa" className="cereri-edit-section-title">
                                Echipă atribuită
                            </h4>
                            <p className="cereri-edit-section-hint">
                                Selectați recrutorii și intervievatorii tehnici implicați în procesul acestui
                                post.
                            </p>
                            <div className="cereri-edit-team-grid cereri-edit-team-grid--stack">
                                <PeoplePicker
                                    title="Recrutori atribuiți"
                                    roleFallback="RECRUTOR"
                                    people={recrutoriDisponibili}
                                    selected={formData.assignedRecrutori || []}
                                    onToggleUsername={toggleRecrutor}
                                    emptyHint="Nu există recrutori sau lista nu s-a încărcat."
                                />
                                <PeoplePicker
                                    title="Intervievatori tehnici"
                                    roleFallback="INTERVIEVATOR_TEHNIC"
                                    people={intervievatoriDisponibili}
                                    selected={formData.assignedIntervievatori || []}
                                    onToggleUsername={toggleIntervievator}
                                    emptyHint="Nu există intervievatori tehnici sau lista nu s-a încărcat."
                                />
                            </div>
                        </section>
                    </div>

                    <footer className="cereri-edit-footer">
                        <button type="button" className="btn btn-anulare" onClick={onClose}>
                            Anulare
                        </button>
                        <button type="submit" className="btn btn-confirma">
                            Salvează modificările
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
