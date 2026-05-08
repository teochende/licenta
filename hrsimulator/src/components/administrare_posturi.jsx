import { useState, useEffect, useCallback, useMemo } from 'react'
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
import IconSearch from './ui/IconSearch'
import SearchableSelect from './ui/SearchableSelect'
import { validateJobDescriereSections } from '../utils/jobDescriereSections.jsx'

const PAGE_SIZE_OPTIONS = [5, 10, 20]

const ADMIN_POSTURI_STARE_OPTIONS = [
    { value: '', label: 'Toate' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
]

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

    const departamentFilterOptions = useMemo(
        () => [
            { value: '', label: 'Toate' },
            ...departamente.map((d) => ({ value: String(d.id), label: d.nume })),
        ],
        [departamente]
    )
    const pageSizeOptions = useMemo(() => PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) })), [])

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
    const recrutoriDisponibili = recrutoriEfectivi
    const intervievatoriDisponibili = intervievatoriEfectivi

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
                nrPozitii: Number(jobActualizat.nrPozitii) || 1,
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
            <div className="administrare-posturi__links">
                <Link to="/recrutari-finalizate" className="administrare-posturi__link-finalizate">
                    Recrutări finalizate
                </Link>
            </div>
            {toolbar}
        </div>
    ) : (
        <>
            <h1>Administrare posturi</h1>
            <div className="administrare-posturi__links">
                <Link to="/recrutari-finalizate" className="administrare-posturi__link-finalizate">
                    Recrutări finalizate
                </Link>
            </div>
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

            <div className="listing-filters-shell">
                <section className="listing-filters" role="search" aria-label="Filtrare posturi">
                    <div className="listing-filters__top">
                        <div className="listing-filter-field listing-filter-field--pagesize">
                            <SearchableSelect
                                id="administrare-posturi-page-size"
                                value={String(pageSize)}
                                ariaLabel="Mărime pagină"
                                placeholder={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(ev) => {
                                    setPageSize(Number(ev.target.value))
                                    setPage(0)
                                }}
                            />
                        </div>
                        <div className="listing-filters__top-search-slot">
                            <div className="listing-filter-field listing-filter-field--search">
                                <div className="listing-search-wrap">
                                    <span className="listing-search-icon" aria-hidden="true">
                                        <IconSearch />
                                    </span>
                                    <input
                                        id="administrare-posturi-search"
                                        type="search"
                                        className="listing-search-input"
                                        placeholder="Nume, subdomeniu, nivel, domeniu…"
                                        value={qInput}
                                        onChange={(ev) => setQInput(ev.target.value)}
                                        autoComplete="off"
                                        aria-label="Căutare posturi"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="listing-filters__secondary">
                        <div className="listing-filters__row">
                            <div className="listing-filter-field">
                                <label className="listing-filter-label" htmlFor="administrare-posturi-stare">
                                    Stare
                                </label>
                                <SearchableSelect
                                    id="administrare-posturi-stare"
                                    value={enabledFilter}
                                    onChange={(ev) => setEnabledFilter(ev.target.value)}
                                    placeholder="Stare"
                                    ariaLabel="Filtru activ"
                                    options={ADMIN_POSTURI_STARE_OPTIONS}
                                />
                            </div>
                            <div className="listing-filter-field">
                                <label className="listing-filter-label" htmlFor="administrare-posturi-dep">
                                    Departament
                                </label>
                                <SearchableSelect
                                    id="administrare-posturi-dep"
                                    value={departamentFilter === '' ? '' : String(departamentFilter)}
                                    onChange={(ev) => setDepartamentFilter(ev.target.value)}
                                    placeholder="Toate"
                                    ariaLabel="Filtru departament"
                                    options={departamentFilterOptions}
                                />
                            </div>
                        </div>
                    </div>
                </section>
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
                            <th>Poziții</th>
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
                                <td colSpan={allowDeletePost ? 11 : 10} className="posturi-admin-empty">
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
                                    <td>
                                        <span title={`Total: ${post.nrPozitii ?? 1} · Libere: ${post.pozitiiLibere ?? 0}`}>
                                            {post.pozitiiLibere ?? 0} / {post.nrPozitii ?? 1}
                                        </span>
                                    </td>
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
                recrutoriDisponibili={recrutoriDisponibili}
                intervievatoriDisponibili={intervievatoriDisponibili}
            />
        </div>
    )
}
