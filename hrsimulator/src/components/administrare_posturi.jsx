import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDepartamente } from '../api/departamenteApi'
import { getRecrutori, getIntervievatoriTehnici } from '../api/hrMetaApi'
import {
    getPosturi,
    deletePost,
    patchPost,
    putPost,
    uploadPostDescriereFisier,
    deletePostDescriereFisier,
} from '../api/postsApi'
import './administrare_posturi.css'
import ModalEditJob from './ModalEditJob'
import { validateJobDescriereSections } from '../utils/jobDescriereSections.jsx'

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export default function AdministrarePosturi({
    recrutoriDto = [],
    intervievatoriDto = [],
    token,
    onRefreshPosturi,
    allowDeletePost = false,
    embeddedInAdmin = false,
}) {
    const [editingId, setEditingId] = useState(null)
    const [departamente, setDepartamente] = useState([])
    /** Reîncărcăm local; după încărcare folosim răspunsul API chiar dacă lista e goală. */
    const [hrMeta, setHrMeta] = useState({ loaded: false, recrutori: [], intervievatori: [] })

    const [posturiRows, setPosturiRows] = useState([])
    const [postTotal, setPostTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [qInput, setQInput] = useState('')
    const [qDebounced, setQDebounced] = useState('')
    const [enabledFilter, setEnabledFilter] = useState('')
    const [departamentFilter, setDepartamentFilter] = useState('')
    const [postsLoading, setPostsLoading] = useState(false)
    const [flashAtentie, setFlashAtentie] = useState('')

    useEffect(() => {
        const k = 'postAdaugat_flashAtentie'
        const m = sessionStorage.getItem(k)
        if (m) {
            sessionStorage.removeItem(k)
            setFlashAtentie(m)
        }
    }, [])

    useEffect(() => {
        const t = setTimeout(() => setQDebounced(qInput.trim()), 350)
        return () => clearTimeout(t)
    }, [qInput])

    useEffect(() => {
        setPage(0)
    }, [qDebounced, enabledFilter, departamentFilter])

    useEffect(() => {
        if (!token) {
            setDepartamente([])
            setHrMeta({ loaded: false, recrutori: [], intervievatori: [] })
            return
        }
        getDepartamente(token)
            .then((rows) => setDepartamente(Array.isArray(rows) ? rows : []))
            .catch(() => setDepartamente([]))
        Promise.all([
            getRecrutori(token).catch(() => []),
            getIntervievatoriTehnici(token).catch(() => []),
        ]).then(([r, i]) => {
            setHrMeta({
                loaded: true,
                recrutori: Array.isArray(r) ? r : [],
                intervievatori: Array.isArray(i) ? i : [],
            })
        })
    }, [token])

    const loadPosts = useCallback(async () => {
        if (!token) {
            setPosturiRows([])
            setPostTotal(0)
            return
        }
        setPostsLoading(true)
        try {
            let enabledParam
            if (enabledFilter === 'true') enabledParam = true
            else if (enabledFilter === 'false') enabledParam = false
            const data = await getPosturi(token, {
                page,
                size: pageSize,
                q: qDebounced || undefined,
                enabled: enabledParam,
                departamentId: departamentFilter || undefined,
            })
            if (data && Array.isArray(data.content)) {
                setPosturiRows(data.content)
                setPostTotal(Number(data.totalElements) || 0)
            } else if (Array.isArray(data)) {
                setPosturiRows(data)
                setPostTotal(data.length)
            } else {
                setPosturiRows([])
                setPostTotal(0)
            }
        } catch {
            setPosturiRows([])
            setPostTotal(0)
        } finally {
            setPostsLoading(false)
        }
    }, [token, page, pageSize, qDebounced, enabledFilter, departamentFilter])

    useEffect(() => {
        loadPosts()
    }, [loadPosts])

    const recrutoriEfectivi = hrMeta.loaded ? hrMeta.recrutori : recrutoriDto
    const intervievatoriEfectivi = hrMeta.loaded ? hrMeta.intervievatori : intervievatoriDto
    const recrutoriNume = recrutoriEfectivi.map((r) => r.numeUtilizator)
    const intervievatoriNume = intervievatoriEfectivi.map((r) => r.numeUtilizator)

    const totalPages = Math.max(1, Math.ceil(postTotal / pageSize) || 1)

    const afterMutation = async () => {
        await loadPosts()
        await onRefreshPosturi?.()
    }

    const toggleEnabled = async (id) => {
        const p = posturiRows.find((x) => x.id === id)
        if (!p || !token) return
        try {
            await patchPost(token, id, { enabled: !p.enabled })
            await afterMutation()
        } catch (e) {
            alert(e?.message || 'Eroare.')
        }
    }

    const deschideEditare = (post) => {
        setEditingId(post.id)
    }

    const inchideModal = () => {
        setEditingId(null)
    }

    const stergePost = async (id) => {
        if (!token || !allowDeletePost) return
        if (!window.confirm('Sigur ștergeți acest post? Se vor șterge și aplicările asociate.')) return
        try {
            await deletePost(token, id)
            await afterMutation()
            if (editingId === id) setEditingId(null)
        } catch (e) {
            alert(e?.message || 'Eroare la ștergere.')
        }
    }

    const salveazaEditare = async (jobActualizat) => {
        if (!token || editingId == null) return
        const idPost = editingId
        const norm = (s) => (s == null ? '' : String(s)).trim().toLowerCase()
        const numeRecrutoriAlesi =
            jobActualizat.assignedRecrutori ?? jobActualizat.assignedRecruteri ?? []
        const numeIntervAlesi = jobActualizat.assignedIntervievatori ?? []
        const recIds = (Array.isArray(numeRecrutoriAlesi) ? numeRecrutoriAlesi : [])
            .map((n) => recrutoriEfectivi.find((r) => norm(r.numeUtilizator) === norm(n))?.id)
            .filter((x) => x != null)
        const intIds = (Array.isArray(numeIntervAlesi) ? numeIntervAlesi : [])
            .map((n) => intervievatoriEfectivi.find((r) => norm(r.numeUtilizator) === norm(n))?.id)
            .filter((x) => x != null)
        const textDesc =
            jobActualizat.descriere != null ? String(jobActualizat.descriere).trim() : ''
        if (textDesc !== '') {
            const { ok, missing } = validateJobDescriereSections(textDesc)
            if (!ok) {
                window.alert(
                    `Descrierea (text) trebuie să conțină toate secțiunile obligatorii. Lipsesc: ${missing.join(', ')}.`
                )
                return
            }
        }
        try {
            await putPost(token, idPost, {
                departamentId: Number(jobActualizat.departamentId),
                subdomeniu: (jobActualizat.subdomeniu || '').trim(),
                nume: (jobActualizat.nume || '').trim(),
                nivel: (jobActualizat.nivel || '').trim(),
                descriere: jobActualizat.descriere != null ? String(jobActualizat.descriere) : '',
                enabled: !!jobActualizat.enabled,
                recrutoriIds: recIds,
                intervievatoriIds: intIds,
            })
            if (jobActualizat.stergeDescriereFisier) {
                await deletePostDescriereFisier(token, idPost)
            } else if (jobActualizat.descriereFisierFile) {
                await uploadPostDescriereFisier(token, idPost, jobActualizat.descriereFisierFile)
            }
            await afterMutation()
            inchideModal()
        } catch (e) {
            alert(e?.message || 'Eroare la salvare.')
        }
    }

    const jobEditat = editingId != null ? posturiRows.find((p) => p.id === editingId) : null

    const toolbar = (
        <div className={embeddedInAdmin ? 'toolbar-administrare toolbar-administrare--embedded' : 'toolbar-administrare'}>
            <Link
                to="/administrare-posturi/adaugare"
                className={embeddedInAdmin ? 'btn-adaugare-post btn-adaugare-post--text' : 'btn-adaugare-post'}
                title="Adaugă post nou"
            >
                {embeddedInAdmin ? '+ Post nou' : '+'}
            </Link>
            {!embeddedInAdmin && <span className="toggleDescriere">Adăugare post</span>}
        </div>
    )

    const heading = embeddedInAdmin ? (
        <div className="administrare-posturi__intro">
            {toolbar}
        </div>
    ) : (
        <>
            <h1>Administrare posturi</h1>
            {toolbar}
        </>
    )

    return (
        <div className={embeddedInAdmin ? 'administrare-posturi administrare-posturi--embedded' : 'administrare-posturi'}>
            {heading}

            {flashAtentie ? (
                <div className="posturi-admin-flash posturi-admin-flash--warning" role="status">
                    <span>{flashAtentie}</span>
                    <button type="button" className="posturi-admin-flash-dismiss" onClick={() => setFlashAtentie('')}>
                        Închide
                    </button>
                </div>
            ) : null}

            <div className="posturi-admin-toolbar" role="search">
                <label className="posturi-admin-toolbar__field">
                    <span className="posturi-admin-toolbar__label">Căutare</span>
                    <input
                        type="search"
                        placeholder="Nume, subdomeniu, nivel, domeniu…"
                        value={qInput}
                        onChange={(ev) => setQInput(ev.target.value)}
                        aria-label="Căutare posturi"
                    />
                </label>
                <label className="posturi-admin-toolbar__field">
                    <span className="posturi-admin-toolbar__label">Stare</span>
                    <select
                        value={enabledFilter}
                        onChange={(ev) => setEnabledFilter(ev.target.value)}
                        aria-label="Filtru activ"
                    >
                        <option value="">Toate</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </label>
                <label className="posturi-admin-toolbar__field">
                    <span className="posturi-admin-toolbar__label">Departament</span>
                    <select
                        value={departamentFilter}
                        onChange={(ev) => setDepartamentFilter(ev.target.value)}
                        aria-label="Filtru departament"
                    >
                        <option value="">Toate</option>
                        {departamente.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.nume}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="posturi-admin-toolbar__field posturi-admin-toolbar__field--narrow">
                    <span className="posturi-admin-toolbar__label">Pe pagină</span>
                    <select
                        value={pageSize}
                        onChange={(ev) => {
                            setPageSize(Number(ev.target.value))
                            setPage(0)
                        }}
                        aria-label="Mărime pagină"
                    >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {postsLoading && <p className="posturi-admin-loading">Se încarcă lista…</p>}

            <div className="jobs-table-wrap">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Domeniu</th>
                            <th>Subdomeniu</th>
                            <th>Nume</th>
                            <th>Nivel</th>
                            <th>Descriere</th>
                            <th>Recruteri</th>
                            <th>Intervievatori</th>
                            <th>Acțiuni</th>
                            {allowDeletePost && <th>Ștergere</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {!postsLoading && posturiRows.length === 0 ? (
                            <tr>
                                <td colSpan={allowDeletePost ? 10 : 9} className="posturi-admin-empty">
                                    Nu există posturi afișate.
                                </td>
                            </tr>
                        ) : (
                            posturiRows.map((post) => (
                                <tr key={post.id} className={post.enabled ? 'row-enabled' : 'row-disabled'}>
                                    <td>{post.id}</td>
                                    <td>{post.domeniu}</td>
                                    <td>{post.subdomeniu}</td>
                                    <td>{post.nume}</td>
                                    <td>{post.nivel}</td>
                                    <td className="jobs-table-descriere">
                                        <span className="jobs-table-descriere-text">
                                            {(post.descriere || '').length > 80
                                                ? `${(post.descriere || '').slice(0, 80)}…`
                                                : post.descriere || '—'}
                                        </span>
                                        {post.descriereFisierStocat && (
                                            <span className="jobs-table-badge-fisier" title={post.descriereFisierNume || 'Fișier'}>
                                                PDF/DOCX
                                            </span>
                                        )}
                                    </td>
                                    <td>{(post.assignedRecrutori || []).join(', ') || '—'}</td>
                                    <td>{(post.assignedIntervievatori || []).join(', ') || '—'}</td>
                                    <td>
                                        <div className="actiuni-celula">
                                            <button
                                                type="button"
                                                className="toggle-btn edit-btn"
                                                onClick={() => deschideEditare(post)}
                                            >
                                                Editare
                                            </button>
                                            <button
                                                className={`toggle-btn ${post.enabled ? 'on' : 'off'}`}
                                                onClick={() => toggleEnabled(post.id)}
                                                title={post.enabled ? 'Dezactivează postul' : 'Activează postul'}
                                            >
                                                {post.enabled ? 'Dezactivează' : 'Activează'}
                                            </button>
                                        </div>
                                    </td>
                                    {allowDeletePost && (
                                        <td>
                                            <button
                                                type="button"
                                                className="toggle-btn delete-post-btn"
                                                onClick={() => stergePost(post.id)}
                                            >
                                                Șterge
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="posturi-admin-pager" aria-label="Paginare posturi">
                <span className="posturi-admin-pager__meta">
                    {postTotal} post{postTotal === 1 ? '' : 'uri'} · pagina {page + 1} din {totalPages}
                </span>
                <div className="posturi-admin-pager__btns">
                    <button
                        type="button"
                        className="toggle-btn"
                        disabled={page <= 0 || postsLoading}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        Înapoi
                    </button>
                    <button
                        type="button"
                        className="toggle-btn"
                        disabled={page + 1 >= totalPages || postsLoading}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Înainte
                    </button>
                </div>
            </div>

            <ModalEditJob
                job={jobEditat}
                token={token}
                onSave={salveazaEditare}
                onClose={inchideModal}
                departamente={departamente}
                recrutoriDisponibili={recrutoriNume}
                intervievatoriDisponibili={intervievatoriNume}
            />
        </div>
    )
}
