import { useState, useEffect, useCallback, useMemo } from 'react'
import JobDisponibil from './job_disponibil'
import { getPosturiDisponibile, getPosturiDisponibileMeta } from '../api/postsApi'
import SearchableSelect from './ui/SearchableSelect'
import IconSearch from './ui/IconSearch'
import './acasa.css'

const PAGE_SIZE_OPTIONS = [5, 10, 20]

function IconChevronLeft() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconChevronRight() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M9 18l6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default function Acasa() {
    const [domeniiUnice, setDomeniiUnice] = useState([])
    const [subdomeniiUnice, setSubdomeniiUnice] = useState([])
    const [niveluriUnice, setNiveluriUnice] = useState([])

    const [posturi, setPosturi] = useState([])
    const [postTotal, setPostTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [qInput, setQInput] = useState('')
    const [qDebounced, setQDebounced] = useState('')
    const [filtruDomeniu, setFiltruDomeniu] = useState('')
    const [filtruSubdomeniu, setFiltruSubdomeniu] = useState('')
    const [filtruNivel, setFiltruNivel] = useState('')
    const [listaLoading, setListaLoading] = useState(false)

    const pageSizeOptions = useMemo(() => PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) })), [])

    const domeniuOptions = useMemo(
        () => [{ value: '', label: 'Toate' }, ...domeniiUnice.map((d) => ({ value: d, label: d }))],
        [domeniiUnice]
    )
    const subdomeniuOptions = useMemo(
        () => [{ value: '', label: 'Toate' }, ...subdomeniiUnice.map((d) => ({ value: d, label: d }))],
        [subdomeniiUnice]
    )
    const nivelOptions = useMemo(
        () => [{ value: '', label: 'Toate' }, ...niveluriUnice.map((d) => ({ value: d, label: d }))],
        [niveluriUnice]
    )

    useEffect(() => {
        getPosturiDisponibileMeta()
            .then((m) => {
                setDomeniiUnice(Array.isArray(m?.domenii) ? m.domenii : [])
                setSubdomeniiUnice(Array.isArray(m?.subdomenii) ? m.subdomenii : [])
                setNiveluriUnice(Array.isArray(m?.niveluri) ? m.niveluri : [])
            })
            .catch(() => {
                setDomeniiUnice([])
                setSubdomeniiUnice([])
                setNiveluriUnice([])
            })
    }, [])

    useEffect(() => {
        const t = setTimeout(() => setQDebounced(qInput.trim()), 350)
        return () => clearTimeout(t)
    }, [qInput])

    useEffect(() => {
        setPage(0)
    }, [qDebounced, filtruDomeniu, filtruSubdomeniu, filtruNivel])

    const loadPosturi = useCallback(async () => {
        setListaLoading(true)
        try {
            const data = await getPosturiDisponibile({
                page,
                size: pageSize,
                q: qDebounced || undefined,
                domeniu: filtruDomeniu || undefined,
                subdomeniu: filtruSubdomeniu || undefined,
                nivel: filtruNivel || undefined,
            })
            if (data && Array.isArray(data.content)) {
                setPosturi(data.content)
                setPostTotal(Number(data.totalElements) || 0)
            } else if (Array.isArray(data)) {
                setPosturi(data)
                setPostTotal(data.length)
            } else {
                setPosturi([])
                setPostTotal(0)
            }
        } catch {
            setPosturi([])
            setPostTotal(0)
        } finally {
            setListaLoading(false)
        }
    }, [page, pageSize, qDebounced, filtruDomeniu, filtruSubdomeniu, filtruNivel])

    useEffect(() => {
        loadPosturi()
    }, [loadPosturi])

    const totalPages = Math.max(1, Math.ceil(postTotal / pageSize) || 1)

    return (
        <div className="acasa-page">
            <h1 className="acasa-title">Poziții disponibile</h1>

            <div className="listing-filters-shell">
                <section className="listing-filters listing-filters--acasa" role="search" aria-label="Căutare și filtrare posturi">
                    <div className="listing-filters__row listing-filters__row--acasa-tools">
                        <div className="listing-filter-field listing-filter-field--pagesize">
                            <label className="listing-filter-label" htmlFor="acasa-page-size">
                                Pe pagină
                            </label>
                            <SearchableSelect
                                id="acasa-page-size"
                                className="acasa-pagesize-select"
                                value={String(pageSize)}
                                ariaLabel="Pe pagină"
                                placeholder={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(ev) => {
                                    setPageSize(Number(ev.target.value))
                                    setPage(0)
                                }}
                            />
                        </div>
                    </div>
                    <div className="listing-filters__row listing-filters__row--acasa-tools">
                        <div className="listing-filter-field listing-filter-field--acasa-search">
                            <label className="listing-filter-label" htmlFor="acasa-cautare">
                                Căutare
                            </label>
                            <div className="listing-search-wrap">
                                <span className="listing-search-icon" aria-hidden="true">
                                    <IconSearch />
                                </span>
                                <input
                                    id="acasa-cautare"
                                    type="search"
                                    className="listing-search-input"
                                    value={qInput}
                                    onChange={(e) => setQInput(e.target.value)}
                                    autoComplete="off"
                                    aria-label="Căutare"
                                />
                            </div>
                        </div>

                        <div className="listing-filter-field">
                            <label className="listing-filter-label" htmlFor="acasa-filtru-domeniu">
                                Departament
                            </label>
                            <SearchableSelect
                                id="acasa-filtru-domeniu"
                                value={filtruDomeniu}
                                onChange={(e) => setFiltruDomeniu(e.target.value)}
                                placeholder="Toate"
                                ariaLabel="Departament"
                                options={domeniuOptions}
                            />
                        </div>
                        <div className="listing-filter-field">
                            <label className="listing-filter-label" htmlFor="acasa-filtru-subdomeniu">
                                Subdomeniu
                            </label>
                            <SearchableSelect
                                id="acasa-filtru-subdomeniu"
                                value={filtruSubdomeniu}
                                onChange={(e) => setFiltruSubdomeniu(e.target.value)}
                                placeholder="Toate"
                                ariaLabel="Subdomeniu"
                                options={subdomeniuOptions}
                            />
                        </div>
                        <div className="listing-filter-field">
                            <label className="listing-filter-label" htmlFor="acasa-filtru-nivel">
                                Nivel
                            </label>
                            <SearchableSelect
                                id="acasa-filtru-nivel"
                                value={filtruNivel}
                                onChange={(e) => setFiltruNivel(e.target.value)}
                                placeholder="Toate"
                                ariaLabel="Nivel"
                                options={nivelOptions}
                            />
                        </div>

                        <div className="listing-filter-field listing-filter-field--acasa-pager" aria-label="Paginare">
                            <label className="listing-filter-label" htmlFor="acasa-page-prev">
                                Pagina
                            </label>
                            <div className="acasa-pager-inline">
                                <p className="acasa-pager-inline__meta">
                                    {postTotal} · {page + 1}/{totalPages}
                                </p>
                                <div className="acasa-pager-inline__actions">
                                    <button
                                        id="acasa-page-prev"
                                        type="button"
                                        className="acasa-pager-btn acasa-pager-btn--icon"
                                        disabled={page <= 0 || listaLoading}
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        aria-label="Înapoi"
                                    >
                                        <IconChevronLeft />
                                    </button>
                                    <button
                                        id="acasa-page-next"
                                        type="button"
                                        className="acasa-pager-btn acasa-pager-btn--icon"
                                        disabled={page + 1 >= totalPages || listaLoading}
                                        onClick={() => setPage((p) => p + 1)}
                                        aria-label="Înainte"
                                    >
                                        <IconChevronRight />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="acasa-list">
                {listaLoading && (
                    <div className="acasa-loading" role="status" aria-live="polite">
                        <span className="acasa-sr-only">Se încarcă</span>
                        <span className="acasa-loading__dots" aria-hidden="true">
                            <span className="acasa-loading__dot" />
                            <span className="acasa-loading__dot" />
                            <span className="acasa-loading__dot" />
                        </span>
                    </div>
                )}
                {!listaLoading &&
                    posturi.map((el) => <JobDisponibil key={el.id} informatiiPost={el} />)}
                {!listaLoading && posturi.length === 0 && <p className="acasa-empty">Niciun rezultat.</p>}
            </div>

            {/* paginarea a fost mutată în bara de filtre (rând unic) */}
        </div>
    )
}
