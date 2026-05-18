import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCereriMele, downloadCerereDescriereFisier, updateCerere } from '../api/cereriApi'
import { getIntervievatoriTehnici, getRecrutori } from '../api/hrMetaApi'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import CereriEditTeamColumn from './CereriEditTeamColumn'
import './CereriList.css'

function previewText(text, max = 280) {
    if (!text || !String(text).trim()) return null
    const s = String(text).trim()
    return s.length <= max ? s : `${s.slice(0, max)}…`
}

function labelStatusCerere(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'pending') return 'În așteptare'
    if (s === 'deschis') return 'Post deschis'
    return status || '—'
}

export default function CereriMele({ token, isAdmin = false }) {
    const navigate = useNavigate()
    const [cereri, setCereri] = useState([])
    const [intervievatoriDto, setIntervievatoriDto] = useState([])
    const [recrutoriDto, setRecrutoriDto] = useState([])
    const [err, setErr] = useState('')
    const [dlErr, setDlErr] = useState('')
    const [editing, setEditing] = useState(null)
    const [editErr, setEditErr] = useState('')
    const [editSaving, setEditSaving] = useState(false)

    const loadCereri = useCallback(async () => {
        if (!token) return
        try {
            const rows = await getCereriMele(token)
            setCereri(Array.isArray(rows) ? rows : [])
            setErr('')
        } catch (e) {
            setCereri([])
            setErr(e?.message || 'Nu s-au putut încărca cererile.')
        }
    }, [token])

    useEffect(() => {
        if (!token) return
        loadCereri()
    }, [token, loadCereri])

    useEffect(() => {
        if (!token) return
        Promise.all([
            getIntervievatoriTehnici(token).catch(() => []),
            getRecrutori(token).catch(() => []),
        ]).then(([i, r]) => {
            setIntervievatoriDto(Array.isArray(i) ? i : [])
            setRecrutoriDto(Array.isArray(r) ? r : [])
        })
    }, [token])

    const handleDownload = async (c) => {
        if (!token || !c?.id) return
        setDlErr('')
        try {
            await downloadCerereDescriereFisier(token, c.id, c.descriereFisierNume || 'descriere.pdf')
        } catch (e) {
            setDlErr(e?.message || 'Nu s-a putut descărca fișierul.')
        }
    }

    const openEdit = (c) => {
        if (c.status !== 'pending') return
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
            await loadCereri()
        } catch (err) {
            setEditErr(err?.message || 'Eroare la salvare.')
        } finally {
            setEditSaving(false)
        }
    }

    return (
        <div className="cereri-list">
            <h1>{isAdmin ? 'Solicitări recrutare' : 'Cererile departamentului'}</h1>
            <p className="cereri-descriere">
                {isAdmin
                    ? 'Lista tuturor solicitărilor de recrutare din toate departamentele. Puteți edita cererile în așteptare sau descărca fișierele de descriere.'
                    : 'Cererile pentru departamentul dumneavoastră (inclusiv create de administrator). Puteți edita cererile în așteptare sau descărca fișierele de descriere.'}
            </p>
            {!isAdmin ? (
                <div className="cereri-top-actions">
                    <button
                        type="button"
                        className="btn btn-confirma"
                        onClick={() => navigate('/cerere-angajare')}
                        title="Deschide formularul de cerere pentru angajare"
                    >
                        Solicită angajare pentru un post
                    </button>
                </div>
            ) : null}
            {err && <p className="cereri-inline-err">{err}</p>}
            {dlErr && <p className="cereri-dl-err">{dlErr}</p>}
            {cereri.length === 0 && !err ? (
                <p className="cereri-gol">Nu aveți cereri înregistrate.</p>
            ) : (
                <ul className="cereri-ul">
                    {cereri.map((c) => (
                        <li key={c.id} className="cerere-item cerere-item-mele">
                            <div className="cerere-item-content">
                                <div className="cerere-item-header">
                                    <strong className="cerere-titlu-post">{c.numePost}</strong>
                                    <span
                                        className="cerere-status-badge"
                                        data-status={String(c.status || '').toLowerCase()}
                                    >
                                        {labelStatusCerere(c.status)}
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
                            {c.status === 'pending' && (
                                <div className="cerere-actions">
                                    <button type="button" className="btn btn-edit" onClick={() => openEdit(c)}>
                                        Editează
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {editing != null && (
                <div className="cereri-modal-overlay" onClick={closeEdit} role="presentation">
                    <div
                        className="cereri-modal cereri-modal-wide cereri-edit-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cereri-edit-title"
                    >
                        <header className="cereri-edit-header">
                            <div className="cereri-edit-header-text">
                                <span className="cereri-edit-eyebrow">Editare cerere</span>
                                <h3 id="cereri-edit-title" className="cereri-edit-title">
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
                            <section className="cereri-edit-section" aria-labelledby="cereri-edit-sec-post">
                                <h4 id="cereri-edit-sec-post" className="cereri-edit-section-title">
                                    Detalii post
                                </h4>
                                <div className="cereri-edit-grid">
                                    <div className="cereri-edit-field cereri-edit-field--full">
                                        <label htmlFor="cereri-edit-nume">Nume post</label>
                                        <input
                                            id="cereri-edit-nume"
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
                                        <label htmlFor="cereri-edit-sub">Subdomeniu</label>
                                        <input
                                            id="cereri-edit-sub"
                                            className="cereri-edit-input"
                                            value={editing.subdomeniu}
                                            onChange={(e) =>
                                                setEditing({ ...editing, subdomeniu: e.target.value })
                                            }
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="cereri-edit-field cereri-edit-field--narrow">
                                        <label htmlFor="cereri-edit-nr">Număr poziții</label>
                                        <input
                                            id="cereri-edit-nr"
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

                            <section className="cereri-edit-section" aria-labelledby="cereri-edit-sec-desc">
                                <h4 id="cereri-edit-sec-desc" className="cereri-edit-section-title">
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
                                    <label htmlFor="cereri-edit-desc" className="visually-hidden">
                                        {editing.descriereMod === 'MANUAL' ? 'Descriere' : 'Note'}
                                    </label>
                                    <textarea
                                        id="cereri-edit-desc"
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

                            <section className="cereri-edit-section" aria-labelledby="cereri-edit-sec-echipa">
                                <h4 id="cereri-edit-sec-echipa" className="cereri-edit-section-title">
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
