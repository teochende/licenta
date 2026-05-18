import { useMemo, useState } from 'react'
import { putIntervievatoriTehnici } from '../api/postsApi'
import IconSearch from './ui/IconSearch'
import './PosturiDepartament.css'

function normalizeIntervievatorSearch(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
}

function matchesIntervievatorSearch(user, queryNorm) {
    if (!queryNorm) return true
    const nume = normalizeIntervievatorSearch(user?.numeUtilizator)
    const email = normalizeIntervievatorSearch(user?.email)
    return nume.includes(queryNorm) || (email && email.includes(queryNorm))
}

function IconBuilding({ className }) {
    return (
        <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
    )
}

function IconUsers({ className }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function IconEdit({ className }) {
    return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}

export default function PosturiDepartament({
    posturi = [],
    departament,
    token,
    onRefresh,
    intervievatoriDto = [],
}) {
    const [modalPostId, setModalPostId] = useState(null)
    const [selectati, setSelectati] = useState([])
    const [cautareIntervievatori, setCautareIntervievatori] = useState('')

    const posturiDepartament = posturi.filter((p) => p.domeniu === departament)
    const modalPost = modalPostId != null ? posturiDepartament.find((p) => p.id === modalPostId) : null
    const cuIntervievatori = posturiDepartament.filter(
        (p) => (p.assignedIntervievatori || []).length > 0
    ).length

    const cautareIntervievatoriNorm = useMemo(
        () => normalizeIntervievatorSearch(cautareIntervievatori),
        [cautareIntervievatori]
    )

    const intervievatoriFiltrati = useMemo(() => {
        if (!cautareIntervievatoriNorm) return intervievatoriDto
        return intervievatoriDto.filter((u) => matchesIntervievatorSearch(u, cautareIntervievatoriNorm))
    }, [intervievatoriDto, cautareIntervievatoriNorm])

    const deschideModal = (post) => {
        setCautareIntervievatori('')
        setModalPostId(post.id)
        const numeCurenti = post.assignedIntervievatori || []
        const ids = intervievatoriDto
            .filter((o) => numeCurenti.includes(o.numeUtilizator))
            .map((o) => o.id)
        setSelectati(ids)
    }

    const inchideModal = () => {
        setModalPostId(null)
        setSelectati([])
        setCautareIntervievatori('')
    }

    const toggleIntervievator = (id) => {
        setSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const salveaza = async () => {
        if (modalPostId == null || !token) return
        try {
            await putIntervievatoriTehnici(token, modalPostId, selectati)
            await onRefresh?.()
            inchideModal()
        } catch (e) {
            alert(e?.message || 'Eroare la salvare.')
        }
    }

    return (
        <div className="posturi-departament">
            <header className="pd-hero">
                <div className="pd-hero-icon" aria-hidden>
                    <IconBuilding />
                </div>
                <div className="pd-hero-text">
                    <h1 className="pd-title">Posturi departament</h1>
                    <p className="pd-dept-name">{departament || '—'}</p>
                    <p className="pd-desc">
                        Atribuiți intervievatori tehnici pentru posturile din departamentul dvs.
                        Modificările se aplică imediat după salvare.
                    </p>
                </div>
                {posturiDepartament.length > 0 && (
                    <div className="pd-stats" aria-label="Statistici departament">
                        <div className="pd-stat">
                            <span className="pd-stat-value">{posturiDepartament.length}</span>
                            <span className="pd-stat-label">
                                {posturiDepartament.length === 1 ? 'post' : 'posturi'}
                            </span>
                        </div>
                        <div className="pd-stat">
                            <span className="pd-stat-value">{cuIntervievatori}</span>
                            <span className="pd-stat-label">cu IT atribuit</span>
                        </div>
                        <div className="pd-stat">
                            <span className="pd-stat-value">
                                {posturiDepartament.length - cuIntervievatori}
                            </span>
                            <span className="pd-stat-label">fără atribuire</span>
                        </div>
                    </div>
                )}
            </header>

            {posturiDepartament.length === 0 ? (
                <div className="pd-empty" role="status">
                    <div className="pd-empty-icon" aria-hidden>
                        <IconBuilding />
                    </div>
                    <p className="pd-empty-title">Nu există posturi în acest departament</p>
                    <p className="pd-empty-hint">
                        Posturile vor apărea aici după ce sunt deschise pentru departamentul dvs.
                    </p>
                </div>
            ) : (
                <ul className="pd-grid">
                    {posturiDepartament.map((post) => {
                        const interv = post.assignedIntervievatori || []
                        const areIt = interv.length > 0
                        const activ = post.enabled !== false

                        return (
                            <li key={post.id} className="pd-card">
                                <div className="pd-card-header">
                                    <div className="pd-card-title-wrap">
                                        <h2 className="pd-card-title">{post.nume}</h2>
                                        <span className="pd-card-id">#{post.id}</span>
                                    </div>
                                    <span
                                        className="pd-badge"
                                        data-variant={activ ? 'activ' : 'inactiv'}
                                    >
                                        {activ ? 'Activ' : 'Inactiv'}
                                    </span>
                                </div>

                                <div className="pd-meta">
                                    <span className="pd-pill">{post.subdomeniu || '—'}</span>
                                    <span className="pd-meta-sep" aria-hidden>
                                        •
                                    </span>
                                    <span className="pd-pill pd-pill--nivel">{post.nivel || '—'}</span>
                                </div>

                                <div className="pd-section">
                                    <div className="pd-section-head">
                                        <IconUsers className="pd-section-icon" />
                                        <span className="pd-section-label">Intervievatori tehnici</span>
                                        <span
                                            className="pd-count-badge"
                                            data-filled={areIt ? 'yes' : 'no'}
                                        >
                                            {interv.length}
                                        </span>
                                    </div>
                                    {areIt ? (
                                        <ul className="pd-chips" aria-label="Intervievatori atribuiți">
                                            {interv.map((nume) => (
                                                <li key={nume} className="pd-chip">
                                                    {nume}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="pd-no-it">Niciun intervievator atribuit încă.</p>
                                    )}
                                </div>

                                <div className="pd-card-actions">
                                    <button
                                        type="button"
                                        className="pd-btn pd-btn--primary"
                                        onClick={() => deschideModal(post)}
                                    >
                                        <IconEdit />
                                        Atribuie / modifică intervievatori
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {modalPostId != null && (
                <div className="pd-modal-overlay" onClick={inchideModal} role="presentation">
                    <div
                        className="pd-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pd-modal-title"
                    >
                        <h3 id="pd-modal-title" className="pd-modal-title">
                            Intervievatori tehnici
                        </h3>
                        {modalPost && (
                            <p className="pd-modal-post">
                                Post: <strong>{modalPost.nume}</strong>
                                <span className="pd-modal-post-id">#{modalPost.id}</span>
                            </p>
                        )}
                        <p className="pd-modal-info">
                            Selectați unul sau mai mulți intervievatori pentru acest post.
                        </p>
                        <div className="pd-modal-interv-section">
                            <div className="pd-modal-interv-section-head">
                                <span className="pd-modal-interv-section-title">Intervievatori tehnici</span>
                                {intervievatoriDto.length > 0 && selectati.length > 0 && (
                                    <span className="pd-modal-selected-count">
                                        {selectati.length} selectat{selectati.length === 1 ? '' : 'i'}
                                    </span>
                                )}
                            </div>
                            {intervievatoriDto.length > 0 && (
                                <div className="pd-modal-search-wrap">
                                    <span className="pd-modal-search-icon" aria-hidden="true">
                                        <IconSearch />
                                    </span>
                                    <input
                                        type="search"
                                        className="pd-modal-search-input"
                                        value={cautareIntervievatori}
                                        onChange={(e) => setCautareIntervievatori(e.target.value)}
                                        placeholder="Căutați după nume utilizator…"
                                        aria-label="Căutare intervievatori tehnici"
                                        autoComplete="off"
                                    />
                                </div>
                            )}
                            <div className="pd-checkbox-list" role="group" aria-label="Listă intervievatori tehnici">
                            {intervievatoriDto.length === 0 ? (
                                <p className="pd-modal-empty-list">
                                    Nu există intervievatori tehnici în sistem.
                                </p>
                            ) : intervievatoriFiltrati.length === 0 ? (
                                <p className="pd-modal-empty-list" role="status">
                                    Nu au fost găsiți intervievatori.
                                </p>
                            ) : (
                                intervievatoriFiltrati.map((u) => {
                                    const checked = selectati.includes(u.id)
                                    return (
                                        <label
                                            key={u.id}
                                            className={`pd-checkbox-item${checked ? ' pd-checkbox-item--checked' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="pd-checkbox-input"
                                                checked={checked}
                                                onChange={() => toggleIntervievator(u.id)}
                                            />
                                            <span className="pd-checkbox-ui" aria-hidden />
                                            <span className="pd-checkbox-label">{u.numeUtilizator}</span>
                                        </label>
                                    )
                                })
                            )}
                            </div>
                        </div>
                        <div className="pd-modal-btns">
                            <button type="button" className="pd-btn pd-btn--ghost" onClick={inchideModal}>
                                Anulare
                            </button>
                            <button
                                type="button"
                                className="pd-btn pd-btn--save"
                                onClick={salveaza}
                                disabled={intervievatoriDto.length === 0}
                            >
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
