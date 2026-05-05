import { useState, useEffect, useCallback } from 'react'
import * as utilizatoriApi from '../api/utilizatoriApi'
import * as departamenteApi from '../api/departamenteApi'
import { getRecrutori, getIntervievatoriTehnici, getRoluri } from '../api/hrMetaApi'
import AdministrarePosturi from './administrare_posturi'
import './AdminPanel.css'

/** Aliniază {@code rolCod} din profil (lowercase) cu valorile enum din formular (ADMIN, …). */
function rolCodToEnum(cod) {
    const m = {
        admin: 'ADMIN',
        intervievator_tehnic: 'INTERVIEVATOR_TEHNIC',
        recrutor: 'RECRUTOR',
        manager_recrutare: 'MANAGER_RECRUTARE',
        manager_departament: 'MANAGER_DEPARTAMENT',
        guest: 'GUEST',
    }
    return m[cod] || 'RECRUTOR'
}

/** Utilizatorul cu rol Manager departament alocat la acel departament (un singur manager per departament). */
function managerDepartamentPentru(depId, utilizatoriList) {
    if (depId == null || !Array.isArray(utilizatoriList)) return null
    return (
        utilizatoriList.find(
            (u) =>
                u.rolCod === 'manager_departament' &&
                u.departamentId != null &&
                Number(u.departamentId) === Number(depId)
        ) ?? null
    )
}

function emptyUserForm() {
    return {
        numeUtilizator: '',
        email: '',
        parola: '',
        rol: 'RECRUTOR',
        departamentId: '',
    }
}

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export default function AdminPanel({ token }) {
    const [tab, setTab] = useState('utilizatori')
    /** Rânduri tabel utilizatori (paginat server). */
    const [utilizatoriRows, setUtilizatoriRows] = useState([])
    /** Lista completă departamente (formulare, cereri). */
    const [departamenteAll, setDepartamenteAll] = useState([])
    /** Rânduri tabel departamente (paginat server). */
    const [departamenteRows, setDepartamenteRows] = useState([])
    /** Toți utilizatorii (fără paginare) — manager departament și dropdown „Setează manager”. */
    const [utilizatoriAll, setUtilizatoriAll] = useState([])
    const [roluri, setRoluri] = useState([])
    const [recrutoriDto, setRecrutoriDto] = useState([])
    const [intervievatoriDto, setIntervievatoriDto] = useState([])
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(false)
    const [userPage, setUserPage] = useState(0)
    const [userPageSize, setUserPageSize] = useState(10)
    const [userTotal, setUserTotal] = useState(0)
    const [userQInput, setUserQInput] = useState('')
    const [userQDebounced, setUserQDebounced] = useState('')
    const [userRolFilter, setUserRolFilter] = useState('')
    const [userDepFilter, setUserDepFilter] = useState('')
    const [depPage, setDepPage] = useState(0)
    const [depPageSize, setDepPageSize] = useState(10)
    const [depTotal, setDepTotal] = useState(0)
    const [depQInput, setDepQInput] = useState('')
    const [depQDebounced, setDepQDebounced] = useState('')
    const [listBusy, setListBusy] = useState(false)
    const [createForm, setCreateForm] = useState(emptyUserForm)
    const [depForm, setDepForm] = useState({ nume: '' })
    const [editingDep, setEditingDep] = useState(null)
    const [editingUser, setEditingUser] = useState(null)
    const [managerForDepId, setManagerForDepId] = useState(null)
    const [managerUserId, setManagerUserId] = useState('')
    /** Formular utilizator nou: deschis doar după click pe indicatorul dropdown */
    const [createUserFormOpen, setCreateUserFormOpen] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setUserQDebounced(userQInput.trim()), 350)
        return () => clearTimeout(t)
    }, [userQInput])

    useEffect(() => {
        const t = setTimeout(() => setDepQDebounced(depQInput.trim()), 350)
        return () => clearTimeout(t)
    }, [depQInput])

    useEffect(() => {
        setUserPage(0)
    }, [userQDebounced, userRolFilter, userDepFilter])

    useEffect(() => {
        setDepPage(0)
    }, [depQDebounced])

    const loadMeta = useCallback(async () => {
        if (!token) return
        setLoading(true)
        setErr('')
        try {
            const [d, r, rec, int] = await Promise.all([
                departamenteApi.getDepartamente(token),
                getRoluri(token),
                getRecrutori(token),
                getIntervievatoriTehnici(token),
            ])
            setDepartamenteAll(Array.isArray(d) ? d : [])
            setRoluri(Array.isArray(r) ? r : [])
            setRecrutoriDto(Array.isArray(rec) ? rec : [])
            setIntervievatoriDto(Array.isArray(int) ? int : [])
        } catch (e) {
            setErr(e?.message || 'Eroare la încărcare.')
        } finally {
            setLoading(false)
        }
    }, [token])

    const loadUtilizatoriPage = useCallback(async () => {
        if (!token) return
        setListBusy(true)
        setErr('')
        try {
            const data = await utilizatoriApi.listUtilizatori(token, {
                page: userPage,
                size: userPageSize,
                q: userQDebounced || undefined,
                rol: userRolFilter || undefined,
                departamentId: userDepFilter || undefined,
            })
            if (data && Array.isArray(data.content)) {
                setUtilizatoriRows(data.content)
                setUserTotal(Number(data.totalElements) || 0)
            } else {
                setUtilizatoriRows([])
                setUserTotal(0)
            }
        } catch (e) {
            setErr(e?.message || 'Eroare la încărcare utilizatori.')
            setUtilizatoriRows([])
        } finally {
            setListBusy(false)
        }
    }, [token, userPage, userPageSize, userQDebounced, userRolFilter, userDepFilter])

    const loadDepartamentePage = useCallback(async () => {
        if (!token) return
        setListBusy(true)
        setErr('')
        try {
            const data = await departamenteApi.getDepartamente(token, {
                page: depPage,
                size: depPageSize,
                q: depQDebounced || undefined,
            })
            if (data && Array.isArray(data.content)) {
                setDepartamenteRows(data.content)
                setDepTotal(Number(data.totalElements) || 0)
            } else {
                setDepartamenteRows([])
                setDepTotal(0)
            }
        } catch (e) {
            setErr(e?.message || 'Eroare la încărcare departamente.')
            setDepartamenteRows([])
        } finally {
            setListBusy(false)
        }
    }, [token, depPage, depPageSize, depQDebounced])

    useEffect(() => {
        if (!token) return
        loadMeta()
    }, [token, loadMeta])

    useEffect(() => {
        if (!token || tab !== 'utilizatori') return
        loadUtilizatoriPage()
    }, [token, tab, loadUtilizatoriPage])

    useEffect(() => {
        if (!token || tab !== 'departamente') return
        loadDepartamentePage()
    }, [token, tab, loadDepartamentePage])

    useEffect(() => {
        if (!token || tab !== 'departamente') return
        let cancelled = false
        ;(async () => {
            try {
                const u = await utilizatoriApi.listUtilizatori(token)
                if (!cancelled) setUtilizatoriAll(Array.isArray(u) ? u : [])
            } catch {
                if (!cancelled) setUtilizatoriAll([])
            }
        })()
        return () => {
            cancelled = true
        }
    }, [token, tab])

    const userTotalPages = Math.max(1, Math.ceil(userTotal / userPageSize) || 1)
    const depTotalPages = Math.max(1, Math.ceil(depTotal / depPageSize) || 1)

    const refreshAfterUserMutate = useCallback(async () => {
        await loadUtilizatoriPage()
        await loadMeta()
        if (tab === 'departamente' && token) {
            try {
                const u = await utilizatoriApi.listUtilizatori(token)
                setUtilizatoriAll(Array.isArray(u) ? u : [])
            } catch {
                /* ignore */
            }
        }
    }, [loadUtilizatoriPage, loadMeta, tab, token])

    const refreshAfterDepMutate = useCallback(async () => {
        await loadDepartamentePage()
        await loadMeta()
    }, [loadDepartamentePage, loadMeta])

    const refreshAfterManagerAssign = useCallback(async () => {
        await loadDepartamentePage()
        await loadMeta()
        if (token) {
            try {
                const u = await utilizatoriApi.listUtilizatori(token)
                setUtilizatoriAll(Array.isArray(u) ? u : [])
            } catch {
                /* ignore */
            }
        }
        await loadUtilizatoriPage()
    }, [loadDepartamentePage, loadMeta, token, loadUtilizatoriPage])

    const refreshCerereCreated = useCallback(async () => {
        await loadMeta()
        await loadDepartamentePage()
    }, [loadMeta, loadDepartamentePage])

    const createUtilizator = async (e) => {
        e.preventDefault()
        setErr('')
        try {
            const body = {
                numeUtilizator: createForm.numeUtilizator.trim(),
                email: createForm.email.trim(),
                parola: createForm.parola,
                rol: createForm.rol,
                departamentId:
                    createForm.rol === 'MANAGER_DEPARTAMENT' && createForm.departamentId
                        ? Number(createForm.departamentId)
                        : null,
            }
            await utilizatoriApi.createUtilizator(token, body)
            setCreateForm(emptyUserForm())
            setCreateUserFormOpen(false)
            await refreshAfterUserMutate()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la creare utilizator.')
        }
    }

    const saveEditUser = async (e) => {
        e.preventDefault()
        if (!editingUser) return
        setErr('')
        try {
            const body = {
                numeUtilizator: editingUser.numeUtilizator?.trim(),
                email: editingUser.email?.trim(),
                rol: editingUser.rol,
            }
            if (editingUser.parola && editingUser.parola.length >= 8) {
                body.parola = editingUser.parola
            }
            if (editingUser.clearDepartament) {
                body.clearDepartament = true
            } else if (editingUser.rol === 'MANAGER_DEPARTAMENT' && editingUser.departamentId) {
                body.departamentId = Number(editingUser.departamentId)
            }
            await utilizatoriApi.patchUtilizator(token, editingUser.id, body)
            setEditingUser(null)
            await refreshAfterUserMutate()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la salvare.')
        }
    }

    const removeUser = async (id) => {
        if (!window.confirm('Ștergeți acest utilizator?')) return
        setErr('')
        try {
            await utilizatoriApi.deleteUtilizator(token, id)
            await refreshAfterUserMutate()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la ștergere.')
        }
    }

    const createDep = async (e) => {
        e.preventDefault()
        if (!depForm.nume.trim()) return
        setErr('')
        try {
            await departamenteApi.createDepartament(token, { nume: depForm.nume.trim() })
            setDepForm({ nume: '' })
            await refreshAfterDepMutate()
        } catch (e2) {
            setErr(e2?.message || 'Eroare.')
        }
    }

    const saveDep = async (e) => {
        e.preventDefault()
        if (!editingDep) return
        setErr('')
        try {
            await departamenteApi.updateDepartament(token, editingDep.id, { nume: editingDep.nume.trim() })
            setEditingDep(null)
            await refreshAfterDepMutate()
        } catch (e2) {
            setErr(e2?.message || 'Eroare.')
        }
    }

    const removeDep = async (id) => {
        if (!window.confirm('Ștergeți departamentul?')) return
        setErr('')
        try {
            await departamenteApi.deleteDepartament(token, id)
            await refreshAfterDepMutate()
        } catch (e2) {
            setErr(e2?.message || 'Nu s-a putut șterge (verificați posturi/utilizatori legați).')
        }
    }

    const assignManager = async (e) => {
        e.preventDefault()
        if (managerForDepId == null || !managerUserId) return
        setErr('')
        try {
            await departamenteApi.assignDepartamentManager(token, managerForDepId, Number(managerUserId))
            setManagerForDepId(null)
            setManagerUserId('')
            await refreshAfterManagerAssign()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la setarea managerului.')
        }
    }

    const rolLabel = (cod) => roluri.find((r) => r.cod === cod)?.denumire || cod

    return (
        <div className="admin-panel">
            <header className="admin-panel__header">
                <h1 className="admin-panel__title">Administrare sistem</h1>
                <p className="admin-panel__lead">
                    Gestionați utilizatori, departamente și posturi dintr-un singur loc. La schimbarea rolului unui utilizator,
                    asignările incompatibile (recrutor / intervievator pe posturi) se actualizează automat în backend.
                </p>
            </header>

            <nav className="admin-tabs" aria-label="Secțiuni administrare">
                <button
                    type="button"
                    className={`admin-tab ${tab === 'utilizatori' ? 'active' : ''}`}
                    onClick={() => setTab('utilizatori')}
                >
                    <span className="admin-tab__icon" aria-hidden>
                        👥
                    </span>
                    <span className="admin-tab__label">
                        <span className="admin-tab__name">Utilizatori</span>
                        <span className="admin-tab__hint">Creare conturi, roluri, ștergere</span>
                    </span>
                </button>
                <button
                    type="button"
                    className={`admin-tab ${tab === 'departamente' ? 'active' : ''}`}
                    onClick={() => setTab('departamente')}
                >
                    <span className="admin-tab__icon" aria-hidden>
                        🏢
                    </span>
                    <span className="admin-tab__label">
                        <span className="admin-tab__name">Departamente</span>
                        <span className="admin-tab__hint">Nume, editare, manager departament</span>
                    </span>
                </button>
                <button
                    type="button"
                    className={`admin-tab ${tab === 'posturi' ? 'active' : ''}`}
                    onClick={() => setTab('posturi')}
                >
                    <span className="admin-tab__icon" aria-hidden>
                        📋
                    </span>
                    <span className="admin-tab__label">
                        <span className="admin-tab__name">Posturi</span>
                        <span className="admin-tab__hint">Listă, editare, alocări, ștergere</span>
                    </span>
                </button>
            </nav>

            {err && (
                <div className="admin-alert admin-alert--error" role="alert">
                    <span className="admin-alert__icon" aria-hidden>
                        !
                    </span>
                    <span>{err}</span>
                </div>
            )}
            {(loading || listBusy) && (
                <div className="admin-loading-bar">
                    <span className="admin-spinner" aria-hidden />
                    <span>Se încarcă datele…</span>
                </div>
            )}

            {tab === 'utilizatori' && (
                <section className="admin-section" aria-labelledby="admin-users-heading">
                    <div className="admin-section__head">
                        <h2 id="admin-users-heading" className="admin-section__title">
                            Utilizatori
                        </h2>
                        <p className="admin-section__desc">
                            Din tabel: <strong>Editează</strong> modifică datele și rolul; <strong>Șterge</strong> elimină
                            contul (dacă nu este singurul administrator). Conturile <strong>Invitat (GUEST)</strong> — în
                            așteptare după înregistrare — apar primele în listă și sunt evidențiate pentru atribuire rapidă
                            a rolului.
                        </p>
                    </div>

                    <div
                        className={`admin-card admin-card--user-create${createUserFormOpen ? ' admin-card--user-create-open' : ''}`}
                    >
                        <div className="admin-user-create-head">
                            <h3 className="admin-card__title admin-card__title--inline">Utilizator nou</h3>
                            <button
                                type="button"
                                id="admin-user-create-toggle"
                                className={`admin-user-create-toggle${createUserFormOpen ? ' admin-user-create-toggle--open' : ''}`}
                                aria-expanded={createUserFormOpen}
                                aria-controls="admin-user-create-form-panel"
                                onClick={() => setCreateUserFormOpen((v) => !v)}
                            >
                                <span className="visually-hidden">
                                    {createUserFormOpen ? 'Închide' : 'Deschide'} formularul utilizator nou
                                </span>
                                <span className="admin-user-create-toggle__chevron" aria-hidden />
                            </button>
                        </div>
                        {createUserFormOpen ? (
                        <form
                            id="admin-user-create-form-panel"
                            className="admin-form-grid admin-user-create-form"
                            onSubmit={createUtilizator}
                        >
                            <div className="admin-field">
                                <span>Nume utilizator</span>
                                <input
                                    value={createForm.numeUtilizator}
                                    onChange={(ev) => setCreateForm((f) => ({ ...f, numeUtilizator: ev.target.value }))}
                                    required
                                    minLength={3}
                                    autoComplete="username"
                                />
                                <p className="admin-form__hint">Minim 3 caractere, unic în sistem.</p>
                            </div>
                            <div className="admin-field">
                                <span>Email</span>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(ev) => setCreateForm((f) => ({ ...f, email: ev.target.value }))}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="admin-field">
                                <span>Parolă inițială</span>
                                <input
                                    type="password"
                                    value={createForm.parola}
                                    onChange={(ev) => setCreateForm((f) => ({ ...f, parola: ev.target.value }))}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <p className="admin-form__hint">Minim 8 caractere; poate fi schimbată ulterior.</p>
                            </div>
                            <div className="admin-field">
                                <span>Rol</span>
                                <select
                                    className="ui-select"
                                    value={createForm.rol}
                                    onChange={(ev) => setCreateForm((f) => ({ ...f, rol: ev.target.value }))}
                                >
                                    {roluri
                                        .filter((r) => r.cod !== 'GUEST')
                                        .map((r) => (
                                            <option key={r.cod} value={r.cod}>
                                                {r.denumire}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            {createForm.rol === 'MANAGER_DEPARTAMENT' && (
                                <div className="admin-field admin-field--full">
                                    <span>Departament</span>
                                    <select
                                        className="ui-select"
                                        value={createForm.departamentId}
                                        onChange={(ev) => setCreateForm((f) => ({ ...f, departamentId: ev.target.value }))}
                                        required
                                    >
                                        <option value="">— Selectați departamentul —</option>
                                        {departamenteAll.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.nume}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="admin-form__hint">Obligatoriu pentru rolul Manager departament.</p>
                                </div>
                            )}
                            <div className="admin-form__submit">
                                <button type="submit" className="admin-btn-primary">
                                    Adaugă utilizator
                                </button>
                            </div>
                        </form>
                        ) : null}
                    </div>

                    <div className="admin-list-toolbar" role="search">
                        <label className="admin-list-toolbar__field">
                            <span className="admin-list-toolbar__label">Căutare</span>
                            <input
                                type="search"
                                className="ui-input"
                                placeholder="Nume sau email…"
                                value={userQInput}
                                onChange={(ev) => setUserQInput(ev.target.value)}
                                aria-label="Căutare utilizatori"
                            />
                        </label>
                        <label className="admin-list-toolbar__field">
                            <span className="admin-list-toolbar__label">Rol</span>
                            <select
                                className="ui-select"
                                value={userRolFilter}
                                onChange={(ev) => setUserRolFilter(ev.target.value)}
                                aria-label="Filtru rol"
                            >
                                <option value="">Toate rolurile</option>
                                {roluri.map((r) => (
                                    <option key={r.cod} value={r.cod}>
                                        {r.denumire}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-list-toolbar__field">
                            <span className="admin-list-toolbar__label">Departament</span>
                            <select
                                className="ui-select"
                                value={userDepFilter}
                                onChange={(ev) => setUserDepFilter(ev.target.value)}
                                aria-label="Filtru departament"
                            >
                                <option value="">Toate</option>
                                {departamenteAll.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nume}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-list-toolbar__field admin-list-toolbar__field--narrow">
                            <span className="admin-list-toolbar__label">Pe pagină</span>
                            <select
                                className="ui-select ui-select--compact ui-select--narrow"
                                value={userPageSize}
                                onChange={(ev) => {
                                    setUserPageSize(Number(ev.target.value))
                                    setUserPage(0)
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

                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <caption className="visually-hidden">Lista utilizatorilor din aplicație</caption>
                            <thead>
                                <tr>
                                    <th scope="col">ID</th>
                                    <th scope="col">Nume</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Rol</th>
                                    <th scope="col">Rol solicitat</th>
                                    <th scope="col">Departament</th>
                                    <th scope="col">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {utilizatoriRows.length === 0 && !loading && !listBusy ? (
                                    <tr>
                                        <td colSpan={7} className="admin-table-empty">
                                            Nu există utilizatori afișați.
                                        </td>
                                    </tr>
                                ) : (
                                    utilizatoriRows.map((u) => (
                                        <tr
                                            key={u.id}
                                            className={u.rolCod === 'guest' ? 'admin-table-row--guest' : undefined}
                                        >
                                            <td>
                                                <span className="admin-id">{u.id}</span>
                                            </td>
                                            <td>{u.numeUtilizator}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span
                                                    className={
                                                        u.rolCod === 'guest'
                                                            ? 'admin-badge admin-badge--guest'
                                                            : 'admin-badge'
                                                    }
                                                >
                                                    {u.rolDenumire || rolLabel(u.rolCod)}
                                                </span>
                                            </td>
                                            <td>
                                                {u.rolDoritDenumire ? (
                                                    <span className="admin-badge admin-badge--muted">{u.rolDoritDenumire}</span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>{u.departamentNume || '—'}</td>
                                            <td className="admin-actions">
                                                <div className="admin-btn-group">
                                                    <button
                                                        type="button"
                                                        className="admin-btn-ghost"
                                                        onClick={() =>
                                                            setEditingUser({
                                                                ...u,
                                                                parola: '',
                                                                clearDepartament: false,
                                                                rol: rolCodToEnum(u.rolCod),
                                                                departamentId: u.departamentId ?? null,
                                                            })
                                                        }
                                                    >
                                                        Editează
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-btn-danger"
                                                        onClick={() => removeUser(u.id)}
                                                    >
                                                        Șterge
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pager" aria-label="Paginare utilizatori">
                        <span className="admin-pager__meta">
                            {userTotal} utilizator{userTotal === 1 ? '' : 'i'} · pagina {userPage + 1} din {userTotalPages}
                        </span>
                        <div className="admin-pager__btns">
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                disabled={userPage <= 0 || listBusy}
                                onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                            >
                                Înapoi
                            </button>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                disabled={userPage + 1 >= userTotalPages || listBusy}
                                onClick={() => setUserPage((p) => p + 1)}
                            >
                                Înainte
                            </button>
                        </div>
                    </div>

                    {editingUser && (
                        <div
                            className="admin-modal-overlay"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="admin-edit-user-title"
                            onClick={() => setEditingUser(null)}
                        >
                            <div className="admin-modal" onClick={(ev) => ev.stopPropagation()}>
                                <div className="admin-modal__head">
                                    <h3 id="admin-edit-user-title">Editare utilizator #{editingUser.id}</h3>
                                    <button
                                        type="button"
                                        className="admin-modal__close"
                                        onClick={() => setEditingUser(null)}
                                        aria-label="Închide"
                                    >
                                        ×
                                    </button>
                                </div>
                                <form onSubmit={saveEditUser}>
                                    <div className="admin-field">
                                        <span>Nume utilizator</span>
                                        <input
                                            value={editingUser.numeUtilizator}
                                            onChange={(ev) => setEditingUser((x) => ({ ...x, numeUtilizator: ev.target.value }))}
                                        />
                                    </div>
                                    <div className="admin-field">
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            value={editingUser.email}
                                            onChange={(ev) => setEditingUser((x) => ({ ...x, email: ev.target.value }))}
                                        />
                                    </div>
                                    <div className="admin-field">
                                        <span>Parolă nouă (opțional)</span>
                                        <input
                                            type="password"
                                            value={editingUser.parola}
                                            onChange={(ev) => setEditingUser((x) => ({ ...x, parola: ev.target.value }))}
                                            minLength={8}
                                            placeholder="lăsați gol pentru a păstra parola"
                                            autoComplete="new-password"
                                        />
                                        <p className="admin-form__hint">Completați doar dacă doriți resetarea parolei (min. 8 caractere).</p>
                                    </div>
                                    <div className="admin-field">
                                        <span>Rol</span>
                                        <select
                                            className="ui-select"
                                            value={editingUser.rol}
                                            onChange={(ev) => setEditingUser((x) => ({ ...x, rol: ev.target.value }))}
                                        >
                                            {roluri.map((r) => (
                                                <option key={r.cod} value={r.cod}>
                                                    {r.denumire}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {editingUser.rol === 'MANAGER_DEPARTAMENT' && (
                                        <div className="admin-field">
                                            <span>Departament</span>
                                            <select
                                                className="ui-select"
                                                value={editingUser.departamentId || ''}
                                                onChange={(ev) =>
                                                    setEditingUser((x) => ({
                                                        ...x,
                                                        departamentId: ev.target.value ? Number(ev.target.value) : null,
                                                    }))
                                                }
                                            >
                                                <option value="">—</option>
                                                {departamenteAll.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.nume}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <label className="admin-field admin-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={!!editingUser.clearDepartament}
                                            onChange={(ev) => setEditingUser((x) => ({ ...x, clearDepartament: ev.target.checked }))}
                                        />
                                        <span>Elimină legătura la departament (păstrează utilizatorul, golește departamentul).</span>
                                    </label>
                                    <div className="admin-modal-actions">
                                        <button type="submit" className="admin-btn-primary">
                                            Salvează modificările
                                        </button>
                                        <button type="button" className="admin-btn-secondary" onClick={() => setEditingUser(null)}>
                                            Anulează
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {tab === 'departamente' && (
                <section className="admin-section" aria-labelledby="admin-dept-heading">
                    <div className="admin-section__head">
                        <h2 id="admin-dept-heading" className="admin-section__title">
                            Departamente
                        </h2>
                        <p className="admin-section__desc">
                            Creați departamente noi, redenumiți-le sau ștergeți-le (dacă nu sunt folosite).{' '}
                            <strong>Setează manager</strong> desemnează un utilizator ca manager de departament; foștii manageri ai
                            aceluiași departament trec la rolul Manager recrutare.
                        </p>
                    </div>

                    <form className="admin-inline-form" onSubmit={createDep}>
                        <input
                            placeholder="Nume departament nou"
                            value={depForm.nume}
                            onChange={(ev) => setDepForm({ nume: ev.target.value })}
                            aria-label="Nume departament nou"
                        />
                        <button type="submit" className="admin-btn-primary">
                            Adaugă departament
                        </button>
                    </form>

                    <div className="admin-list-toolbar" role="search">
                        <label className="admin-list-toolbar__field">
                            <span className="admin-list-toolbar__label">Căutare</span>
                            <input
                                type="search"
                                className="ui-input"
                                placeholder="Nume departament…"
                                value={depQInput}
                                onChange={(ev) => setDepQInput(ev.target.value)}
                                aria-label="Căutare departamente"
                            />
                        </label>
                        <label className="admin-list-toolbar__field admin-list-toolbar__field--narrow">
                            <span className="admin-list-toolbar__label">Pe pagină</span>
                            <select
                                className="ui-select ui-select--compact ui-select--narrow"
                                value={depPageSize}
                                onChange={(ev) => {
                                    setDepPageSize(Number(ev.target.value))
                                    setDepPage(0)
                                }}
                                aria-label="Mărime pagină departamente"
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <caption className="visually-hidden">Lista departamentelor</caption>
                            <thead>
                                <tr>
                                    <th scope="col">ID</th>
                                    <th scope="col">Nume</th>
                                    <th scope="col">Manager departament</th>
                                    <th scope="col">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departamenteRows.length === 0 && !loading && !listBusy ? (
                                    <tr>
                                        <td colSpan={4} className="admin-table-empty">
                                            Nu există departamente afișate.
                                        </td>
                                    </tr>
                                ) : (
                                    departamenteRows.map((d) => {
                                    const mgr = managerDepartamentPentru(d.id, utilizatoriAll)
                                    return (
                                        <tr key={d.id}>
                                            <td>
                                                <span className="admin-id">{d.id}</span>
                                            </td>
                                            <td>
                                                {editingDep?.id === d.id ? (
                                                    <input
                                                        className="admin-table-input"
                                                        value={editingDep.nume}
                                                        onChange={(ev) => setEditingDep({ ...editingDep, nume: ev.target.value })}
                                                        aria-label="Editare nume departament"
                                                    />
                                                ) : (
                                                    d.nume
                                                )}
                                            </td>
                                            <td className="admin-dept-manager-cell">
                                                {mgr ? (
                                                    <>
                                                        <div className="admin-dept-manager-name">{mgr.numeUtilizator}</div>
                                                        <div className="admin-dept-manager-email">{mgr.email}</div>
                                                    </>
                                                ) : (
                                                    <span className="admin-dept-manager-lipsa">—</span>
                                                )}
                                            </td>
                                            <td className="admin-actions">
                                                {editingDep?.id === d.id ? (
                                                    <div className="admin-btn-group">
                                                        <button type="button" className="admin-btn-primary" onClick={saveDep}>
                                                            Salvează
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-btn-secondary"
                                                            onClick={() => setEditingDep(null)}
                                                        >
                                                            Anulează
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="admin-btn-group">
                                                        <button type="button" className="admin-btn-ghost" onClick={() => setEditingDep({ ...d })}>
                                                            Editează
                                                        </button>
                                                        <button type="button" className="admin-btn-danger" onClick={() => removeDep(d.id)}>
                                                            Șterge
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-btn-ghost"
                                                            onClick={() => {
                                                                setManagerForDepId(d.id)
                                                                setManagerUserId('')
                                                            }}
                                                        >
                                                            Setează manager
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pager" aria-label="Paginare departamente">
                        <span className="admin-pager__meta">
                            {depTotal} departament{depTotal === 1 ? '' : 'e'} · pagina {depPage + 1} din {depTotalPages}
                        </span>
                        <div className="admin-pager__btns">
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                disabled={depPage <= 0 || listBusy}
                                onClick={() => setDepPage((p) => Math.max(0, p - 1))}
                            >
                                Înapoi
                            </button>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                disabled={depPage + 1 >= depTotalPages || listBusy}
                                onClick={() => setDepPage((p) => p + 1)}
                            >
                                Înainte
                            </button>
                        </div>
                    </div>

                    {managerForDepId != null && (
                        <div className="admin-manager-panel">
                            <h3>Setare manager pentru departament #{managerForDepId}</h3>
                            <p className="admin-hint">
                                Alegeți utilizatorul care devine <strong>Manager departament</strong> pentru acest departament. Foștii
                                manageri ai aceluiași departament sunt retrogradați automat la „Manager recrutare”.
                            </p>
                            <form onSubmit={assignManager}>
                                <div className="admin-field">
                                    <span id="admin-manager-label">Utilizator</span>
                                    <select
                                        id="admin-manager-select"
                                        className="ui-select"
                                        aria-labelledby="admin-manager-label"
                                        value={managerUserId}
                                        onChange={(ev) => setManagerUserId(ev.target.value)}
                                        required
                                    >
                                        <option value="">— Alegeți utilizatorul —</option>
                                        {utilizatoriAll.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.numeUtilizator} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-manager-actions">
                                    <button type="submit" className="admin-btn-primary">
                                        Confirmă manager
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn-secondary"
                                        onClick={() => setManagerForDepId(null)}
                                    >
                                        Renunță
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </section>
            )}

            {tab === 'posturi' && (
                <section className="admin-section admin-posturi-block" aria-labelledby="admin-posts-heading">
                    <div className="admin-section__head">
                        <h2 id="admin-posts-heading" className="admin-section__title">
                            Posturi (joburi)
                        </h2>
                        <p className="admin-section__desc">
                            Aceeași funcționalitate ca în pagina „Administrare posturi”: editați descrierea, activați sau dezactivați
                            postul, alocați recrutori și intervievatori. Butonul <strong>Șterge</strong> elimină postul și toate
                            aplicările asociate din baza de date.
                        </p>
                    </div>
                    <AdministrarePosturi
                        recrutoriDto={recrutoriDto}
                        intervievatoriDto={intervievatoriDto}
                        token={token}
                        onRefreshPosturi={loadMeta}
                        allowDeletePost
                        embeddedInAdmin
                    />
                </section>
            )}

        </div>
    )
}
