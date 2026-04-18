import { useState, useEffect, useCallback } from 'react'
import { getCereriMele, downloadCerereDescriereFisier, updateCerere } from '../api/cereriApi'
import { getIntervievatoriTehnici, getRecrutori } from '../api/hrMetaApi'
import { validateJobDescriereSections, JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './CereriList.css'

function previewText(text, max = 280) {
    if (!text || !String(text).trim()) return null
    const s = String(text).trim()
    return s.length <= max ? s : `${s.slice(0, max)}…`
}

/**
 * Manager departament: cereri pentru departamentul său. Administrator: toate cererile din sistem.
 */
export default function CereriMele({ token, isAdmin = false }) {
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
            <h1>{isAdmin ? 'Toate cererile de angajare' : 'Cererile departamentului'}</h1>
            <p className="cereri-descriere">
                {isAdmin
                    ? 'Lista tuturor cererilor din toate departamentele. Puteți edita cererile în așteptare sau descărca fișierele de descriere.'
                    : 'Cererile pentru departamentul dumneavoastră (inclusiv create de administrator). Puteți edita cererile în așteptare sau descărca fișierele de descriere.'}
            </p>
            {err && <p style={{ color: 'crimson' }}>{err}</p>}
            {dlErr && <p className="cereri-dl-err">{dlErr}</p>}
            {cereri.length === 0 && !err ? (
                <p className="cereri-gol">Nu aveți cereri înregistrate.</p>
            ) : (
                <ul className="cereri-ul">
                    {cereri.map((c) => (
                        <li key={c.id} className="cerere-item cerere-item-mele">
                            <div className="cerere-item-content">
                                <strong>{c.numePost}</strong>
                                <span className="cerere-meta">
                                    Status: <strong>{c.status}</strong> · Domeniu: {c.departament}
                                    {c.subdomeniu ? ` · Subdomeniu: ${c.subdomeniu}` : ''} | Poziții: {c.nrPozitii}
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
                <div className="cereri-modal-overlay" onClick={closeEdit}>
                    <div className="cereri-modal cereri-modal-wide" onClick={(e) => e.stopPropagation()}>
                        <h3>Editează cererea #{editing.id}</h3>
                        {editErr && <p className="cereri-dl-err">{editErr}</p>}
                        <form onSubmit={saveEdit}>
                            <div className="cereri-edit-field">
                                <label>Nume post</label>
                                <input
                                    value={editing.numePost}
                                    onChange={(e) => setEditing({ ...editing, numePost: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="cereri-edit-field">
                                <label>Subdomeniu</label>
                                <input
                                    value={editing.subdomeniu}
                                    onChange={(e) => setEditing({ ...editing, subdomeniu: e.target.value })}
                                />
                            </div>
                            <div className="cereri-edit-field">
                                <label>Număr poziții</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={editing.nrPozitii}
                                    onChange={(e) => setEditing({ ...editing, nrPozitii: e.target.value })}
                                />
                            </div>
                            <div className="cereri-edit-field">
                                <label>
                                    {editing.descriereMod === 'MANUAL' ? 'Descriere' : 'Note (fișier separat)'}
                                </label>
                                <JobDescriereSectiuniHint
                                    className="cereri-edit-structura-hint"
                                    compact={editing.descriereMod !== 'MANUAL'}
                                />
                                <textarea
                                    rows={editing.descriereMod === 'MANUAL' ? 5 : 3}
                                    value={editing.descriere}
                                    onChange={(e) => setEditing({ ...editing, descriere: e.target.value })}
                                    required={editing.descriereMod === 'MANUAL'}
                                />
                            </div>
                            <div className="cereri-edit-field">
                                <span className="label">Intervievatori tehnici</span>
                                <div className="checkbox-list">
                                    {intervievatoriDto.map((inv) => (
                                        <label key={inv.id} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={editing.intervievatoriSelectati.includes(inv.id)}
                                                onChange={() => toggleEditInterv(inv.id)}
                                            />
                                            {inv.numeUtilizator}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="cereri-edit-field">
                                <span className="label">Recrutori propuși</span>
                                <div className="checkbox-list">
                                    {recrutoriDto.map((r) => (
                                        <label key={r.id} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={editing.recrutoriSelectati.includes(r.id)}
                                                onChange={() => toggleEditRecr(r.id)}
                                            />
                                            {r.numeUtilizator}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="cereri-modal-btns">
                                <button type="button" className="btn btn-anulare" onClick={closeEdit}>
                                    Anulare
                                </button>
                                <button type="submit" className="btn btn-confirma" disabled={editSaving}>
                                    {editSaving ? 'Se salvează…' : 'Salvează'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
