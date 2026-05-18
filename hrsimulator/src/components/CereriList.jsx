import { useState } from 'react'
import { downloadCerereDescriereFisier, updateCerere } from '../api/cereriApi'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import CereriEditTeamColumn from './CereriEditTeamColumn'
import './CereriList.css'

function previewText(text, max = 280) {
    if (!text || !String(text).trim()) return null
    const s = String(text).trim()
    return s.length <= max ? s : `${s.slice(0, max)}…`
}

export default function CereriList({
    cereri = [],
    onDeschidePost,
    recrutoriDto = [],
    intervievatoriDto = [],
    token,
    onRefreshCereri,
}) {
    const [modalCerereId, setModalCerereId] = useState(null)
    const [modalCerere, setModalCerere] = useState(null)
    const [recrutoriSelectati, setRecrutoriSelectati] = useState([])
    const [dlErr, setDlErr] = useState('')
    const [editing, setEditing] = useState(null)
    const [editErr, setEditErr] = useState('')
    const [editSaving, setEditSaving] = useState(false)

    const cereriPending = cereri.filter((c) => c.status === 'pending')

    const openModal = (c) => {
        setModalCerereId(c.id)
        setModalCerere(c)
        const ids = Array.isArray(c.recrutoriIds) ? c.recrutoriIds : []
        setRecrutoriSelectati([...ids])
    }

    const closeModal = () => {
        setModalCerereId(null)
        setModalCerere(null)
        setRecrutoriSelectati([])
    }

    const toggleRecrutor = (id) => {
        setRecrutoriSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const handleDeschide = async () => {
        if (modalCerereId == null) return
        try {
            await onDeschidePost?.(modalCerereId, recrutoriSelectati)
            closeModal()
            await onRefreshCereri?.()
        } catch (e) {
            alert(e?.message || 'Eroare la deschiderea postului.')
        }
    }

    const openEdit = (c) => {
        setEditErr('')
        setEditing({
            id: c.id,
            numePost: c.numePost || '',
            subdomeniu: c.subdomeniu || '',
            nrPozitii: c.nrPozitii ?? 1,
            descriere: c.descriere || '',
            descriereMod: c.descriereMod || 'MANUAL',
            intervievatoriSelectati: [...(Array.isArray(c.intervievatoriTehniciIds) ? c.intervievatoriTehniciIds : [])],
            recrutoriSelectati: [...(Array.isArray(c.recrutoriIds) ? c.recrutoriIds : [])],
        })
    }

    const closeEdit = () => {
        setEditing(null)
        setEditErr('')
    }

    const toggleEditInterv = (id) => {
        setEditing((prev) => {
            if (!prev) return prev
            const s = prev.intervievatoriSelectati
            return {
                ...prev,
                intervievatoriSelectati: s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
            }
        })
    }

    const toggleEditRecr = (id) => {
        setEditing((prev) => {
            if (!prev) return prev
            const s = prev.recrutoriSelectati
            return {
                ...prev,
                recrutoriSelectati: s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
            }
        })
    }

    const saveEdit = async (e) => {
        e.preventDefault()
        if (!editing || !token) return
        if (editing.descriereMod === 'MANUAL' && !String(editing.descriere).trim()) {
            setEditErr('Completați descrierea.')
            return
        }
        if (editing.descriereMod === 'MANUAL') {
            const { ok, missing } = validateJobDescriereSections(String(editing.descriere).trim())
            if (!ok) {
                setEditErr(`Descrierea trebuie să conțină toate secțiunile obligatorii. Lipsesc: ${missing.join(', ')}.`)
                return
            }
        }
        setEditErr('')
        setEditSaving(true)
        try {
            await updateCerere(token, editing.id, {
                numePost: editing.numePost.trim(),
                subdomeniu: editing.subdomeniu.trim(),
                nrPozitii: Number(editing.nrPozitii) || 1,
                descriere: editing.descriere,
                intervievatoriTehniciIds: editing.intervievatoriSelectati,
                recrutoriIds: editing.recrutoriSelectati,
            })
            closeEdit()
            await onRefreshCereri?.()
        } catch (err) {
            setEditErr(err?.message || 'Eroare la salvare.')
        } finally {
            setEditSaving(false)
        }
    }

    const handleDownload = async (c) => {
        if (!token || !c?.id) return
        setDlErr('')
        try {
            await downloadCerereDescriereFisier(token, c.id, c.descriereFisierNume || 'descriere.pdf')
        } catch (e) {
            setDlErr(e?.message || 'Nu s-a putut descărca fișierul.')
        }
    }

    return (
        <div className="cereri-list">
            <h1>Cereri de angajare</h1>
            <p className="cereri-descriere">
                Cererile în așteptare. Puteți edita detaliile (HR sau manager departament) sau deschide un post și atribui
                recrutori.
            </p>
            {dlErr && <p className="cereri-dl-err">{dlErr}</p>}
            {cereriPending.length === 0 ? (
                <p className="cereri-gol">Nu există cereri în așteptare.</p>
            ) : (
                <ul className="cereri-ul">
                    {cereriPending.map((c) => (
                        <li key={c.id} className="cerere-item">
                            <div className="cerere-item-content">
                                <div className="cerere-item-header">
                                    <strong className="cerere-titlu-post">{c.numePost}</strong>
                                    <span className="cerere-status-badge" data-status="pending">
                                        În așteptare
                                    </span>
                                </div>
                                <span className="cerere-meta">
                                    Domeniu: {c.departament}
                                    {c.subdomeniu ? ` · Subdomeniu: ${c.subdomeniu}` : ''} · Poziții: {c.nrPozitii}
                                </span>
                                <span className="cerere-mod">
                                    Descriere:{' '}
                                    {c.descriereMod === 'FISIER' ? 'fișier încărcat' : 'text introdus manual'}
                                </span>
                                {c.descriereMod === 'MANUAL' && c.descriere && (
                                    <p className="cerere-descriere-scurta">{previewText(c.descriere)}</p>
                                )}
                                {c.descriereMod === 'FISIER' &&
                                    (c.areFisierDescriere === true || !!c.descriereFisierNume) && (
                                        <div className="cerere-fisier-row">
                                            <span className="cerere-fisier-nume">
                                                Fișier: {c.descriereFisierNume || 'descriere'}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-download"
                                                onClick={() => handleDownload(c)}
                                            >
                                                Descarcă
                                            </button>
                                        </div>
                                    )}
                                {c.descriereMod === 'FISIER' && c.descriere && (
                                    <p className="cerere-note">Note: {previewText(c.descriere, 200)}</p>
                                )}
                                {c.intervievatoriTehnici?.length > 0 && (
                                    <span className="cerere-interv">
                                        Intervievatori: {c.intervievatoriTehnici.join(', ')}
                                    </span>
                                )}
                                {c.recrutori?.length > 0 && (
                                    <span className="cerere-interv cerere-recr">
                                        Recrutori propuși: {c.recrutori.join(', ')}
                                    </span>
                                )}
                            </div>
                            <div className="cerere-actions">
                                <button type="button" className="btn btn-edit" onClick={() => openEdit(c)}>
                                    Editează
                                </button>
                                <button type="button" className="btn btn-deschide" onClick={() => openModal(c)}>
                                    Deschide post
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modalCerereId != null && (
                <div className="cereri-modal-overlay" onClick={closeModal}>
                    <div className="cereri-modal cereri-modal-wide" onClick={(e) => e.stopPropagation()}>
                        <h3>Atribuie recrutori postului</h3>
                        <p className="cereri-modal-info">
                            {modalCerere?.recrutoriIds?.length > 0
                                ? 'Sunt preselectați recrutorii propuși pe cerere; puteți modifica înainte de confirmare.'
                                : 'Selectați unul sau mai mulți recrutori pentru acest post.'}
                        </p>
                        <div className="checkbox-list">
                            {recrutoriDto.map((r) => (
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
                        <div className="cereri-modal-btns">
                            <button type="button" className="btn btn-anulare" onClick={closeModal}>
                                Anulare
                            </button>
                            <button type="button" className="btn btn-confirma" onClick={handleDeschide}>
                                Confirmă și deschide post
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editing != null && (
                <div className="cereri-modal-overlay" onClick={closeEdit} role="presentation">
                    <div
                        className="cereri-modal cereri-modal-wide cereri-edit-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cereri-list-edit-title"
                    >
                        <header className="cereri-edit-header">
                            <div className="cereri-edit-header-text">
                                <span className="cereri-edit-eyebrow">Editare cerere</span>
                                <h3 id="cereri-list-edit-title" className="cereri-edit-title">
                                    {editing.numePost?.trim() || 'Cerere de angajare'}
                                </h3>
                                <p className="cereri-edit-subtitle">
                                    Referință <strong>#{editing.id}</strong>
                                    {editing.descriereMod === 'FISIER'
                                        ? ' · descriere din fișier'
                                        : ' · descriere text'}
                                </p>
                            </div>
                            <span className="cerere-status-badge" data-status="pending">
                                În așteptare
                            </span>
                        </header>

                        {editErr && (
                            <p className="cereri-edit-alert" role="alert">
                                {editErr}
                            </p>
                        )}

                        <form className="cereri-edit-form" onSubmit={saveEdit}>
                            <div className="cereri-edit-scroll">
                                <section
                                    className="cereri-edit-section"
                                    aria-labelledby="cereri-list-edit-sec-post"
                                >
                                    <h4
                                        id="cereri-list-edit-sec-post"
                                        className="cereri-edit-section-title"
                                    >
                                        Detalii post
                                    </h4>
                                    <div className="cereri-edit-grid">
                                        <div className="cereri-edit-field cereri-edit-field--full">
                                            <label htmlFor="cereri-list-edit-nume">Nume post</label>
                                            <input
                                                id="cereri-list-edit-nume"
                                                className="cereri-edit-input"
                                                value={editing.numePost}
                                                onChange={(e) =>
                                                    setEditing({ ...editing, numePost: e.target.value })
                                                }
                                                required
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div className="cereri-edit-field">
                                            <label htmlFor="cereri-list-edit-sub">Subdomeniu</label>
                                            <input
                                                id="cereri-list-edit-sub"
                                                className="cereri-edit-input"
                                                value={editing.subdomeniu}
                                                onChange={(e) =>
                                                    setEditing({ ...editing, subdomeniu: e.target.value })
                                                }
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div className="cereri-edit-field cereri-edit-field--narrow">
                                            <label htmlFor="cereri-list-edit-nr">Număr poziții</label>
                                            <input
                                                id="cereri-list-edit-nr"
                                                className="cereri-edit-input cereri-edit-input--number"
                                                type="number"
                                                min={1}
                                                value={editing.nrPozitii}
                                                onChange={(e) =>
                                                    setEditing({ ...editing, nrPozitii: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section
                                    className="cereri-edit-section"
                                    aria-labelledby="cereri-list-edit-sec-desc"
                                >
                                    <h4
                                        id="cereri-list-edit-sec-desc"
                                        className="cereri-edit-section-title"
                                    >
                                        {editing.descriereMod === 'MANUAL'
                                            ? 'Descriere job'
                                            : 'Note suplimentare'}
                                    </h4>
                                    <p className="cereri-edit-section-hint">
                                        {editing.descriereMod === 'MANUAL'
                                            ? 'Textul trebuie să includă toate secțiunile obligatorii ale descrierii.'
                                            : 'Fișierul de descriere rămâne atașat cererii; editați doar notele de mai jos.'}
                                    </p>
                                    <JobDescriereSectiuniHint
                                        className="cereri-edit-structura-hint"
                                        compact={editing.descriereMod !== 'MANUAL'}
                                    />
                                    <div className="cereri-edit-field cereri-edit-field--full">
                                        <label htmlFor="cereri-list-edit-desc" className="visually-hidden">
                                            {editing.descriereMod === 'MANUAL' ? 'Descriere' : 'Note'}
                                        </label>
                                        <textarea
                                            id="cereri-list-edit-desc"
                                            className="cereri-edit-textarea"
                                            rows={editing.descriereMod === 'MANUAL' ? 6 : 4}
                                            value={editing.descriere}
                                            onChange={(e) =>
                                                setEditing({ ...editing, descriere: e.target.value })
                                            }
                                            required={editing.descriereMod === 'MANUAL'}
                                            placeholder={
                                                editing.descriereMod === 'MANUAL'
                                                    ? 'Introduceți descrierea completă a postului…'
                                                    : 'Note opționale…'
                                            }
                                        />
                                    </div>
                                </section>

                                <section
                                    className="cereri-edit-section"
                                    aria-labelledby="cereri-list-edit-sec-echipa"
                                >
                                    <h4
                                        id="cereri-list-edit-sec-echipa"
                                        className="cereri-edit-section-title"
                                    >
                                        Echipă propusă
                                    </h4>
                                    <p className="cereri-edit-section-hint">
                                        Selectați intervievatorii tehnici și recrutorii care vor fi implicați în
                                        proces.
                                    </p>
                                    <div className="cereri-edit-team-grid">
                                        <CereriEditTeamColumn
                                            title="Intervievatori tehnici"
                                            items={intervievatoriDto}
                                            selectedIds={editing.intervievatoriSelectati}
                                            onToggle={toggleEditInterv}
                                            searchPlaceholder="Căutați intervievator…"
                                            searchAriaLabel="Căutare intervievatori tehnici"
                                            listAriaLabel="Intervievatori tehnici"
                                            emptyListMessage="Nu există intervievatori tehnici disponibili."
                                            noResultsMessage="Nu au fost găsiți intervievatori."
                                        />
                                        <CereriEditTeamColumn
                                            title="Recrutori propuși"
                                            items={recrutoriDto}
                                            selectedIds={editing.recrutoriSelectati}
                                            onToggle={toggleEditRecr}
                                            searchPlaceholder="Căutați recrutor…"
                                            searchAriaLabel="Căutare recrutori"
                                            listAriaLabel="Recrutori propuși"
                                            emptyListMessage="Nu există recrutori disponibili."
                                            noResultsMessage="Nu au fost găsiți recrutori."
                                        />
</div>
                                </section>
                            </div>

                            <footer className="cereri-edit-footer">
                                <button type="button" className="btn btn-anulare" onClick={closeEdit}>
                                    Anulare
                                </button>
                                <button type="submit" className="btn btn-confirma" disabled={editSaving}>
                                    {editSaving ? 'Se salvează…' : 'Salvează modificările'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
