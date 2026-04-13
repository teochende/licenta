import { useState, useEffect, useCallback } from 'react'
import * as utilizatoriApi from '../api/utilizatoriApi'
import * as departamenteApi from '../api/departamenteApi'
import { getPosturi } from '../api/postsApi'
import { getRecrutori, getIntervievatoriTehnici, getRoluri } from '../api/hrMetaApi'
import { recalcAplicatiiMatchScore } from '../api/aplicatiiApi'
import AdministrarePosturi from './administrare_posturi'
import AdminCerereAngajare from './AdminCerereAngajare'
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

export default function AdminPanel({ token }) {
    const [tab, setTab] = useState('utilizatori')
    const [utilizatori, setUtilizatori] = useState([])
    const [departamente, setDepartamente] = useState([])
    const [roluri, setRoluri] = useState([])
    const [posturi, setPosturi] = useState([])
    const [recrutoriDto, setRecrutoriDto] = useState([])
    const [intervievatoriDto, setIntervievatoriDto] = useState([])
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(false)
    const [createForm, setCreateForm] = useState(emptyUserForm)
    const [depForm, setDepForm] = useState({ nume: '' })
    const [editingDep, setEditingDep] = useState(null)
    const [editingUser, setEditingUser] = useState(null)
    const [managerForDepId, setManagerForDepId] = useState(null)
    const [managerUserId, setManagerUserId] = useState('')
    const [recalcInfo, setRecalcInfo] = useState('')

    const loadAll = useCallback(async () => {
        if (!token) return
        setLoading(true)
        setErr('')
        try {
            const [u, d, r, p, rec, int] = await Promise.all([
                utilizatoriApi.listUtilizatori(token),
                departamenteApi.getDepartamente(token),
                getRoluri(token),
                getPosturi(token),
                getRecrutori(token),
                getIntervievatoriTehnici(token),
            ])
            setUtilizatori(Array.isArray(u) ? u : [])
            setDepartamente(Array.isArray(d) ? d : [])
            setRoluri(Array.isArray(r) ? r : [])
            setPosturi(Array.isArray(p) ? p : [])
            setRecrutoriDto(Array.isArray(rec) ? rec : [])
            setIntervievatoriDto(Array.isArray(int) ? int : [])
        } catch (e) {
            setErr(e?.message || 'Eroare la încărcare.')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        loadAll()
    }, [loadAll])

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
            await loadAll()
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
            await loadAll()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la salvare.')
        }
    }

    const removeUser = async (id) => {
        if (!window.confirm('Ștergeți acest utilizator?')) return
        setErr('')
        try {
            await utilizatoriApi.deleteUtilizator(token, id)
            await loadAll()
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
            await loadAll()
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
            await loadAll()
        } catch (e2) {
            setErr(e2?.message || 'Eroare.')
        }
    }

    const removeDep = async (id) => {
        if (!window.confirm('Ștergeți departamentul?')) return
        setErr('')
        try {
            await departamenteApi.deleteDepartament(token, id)
            await loadAll()
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
            await loadAll()
        } catch (e2) {
            setErr(e2?.message || 'Eroare la setarea managerului.')
        }
    }

    const rolLabel = (cod) => roluri.find((r) => r.cod === cod)?.denumire || cod

    const runRecalcMatch = async (onlyMissing) => {
        if (!token) return
        setErr('')
        setRecalcInfo('')
        setLoading(true)
        try {
            const res = await recalcAplicatiiMatchScore(token, { onlyMissing })
            setRecalcInfo(
                `Recalcul finalizat. Procesate: ${res?.processed ?? 0}, actualizate: ${res?.updated ?? 0}, ` +
                    `AI: ${res?.skippedAi ?? 0}, fără text: ${res?.skippedNoText ?? 0}.`
            )
        } catch (e) {
            setErr(e?.message || 'Eroare la recalculare scoruri.')
        } finally {
            setLoading(false)
        }
    }

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
                <button
                    type="button"
                    className={`admin-tab ${tab === 'cerere-angajare' ? 'active' : ''}`}
                    onClick={() => setTab('cerere-angajare')}
                >
                    <span className="admin-tab__icon" aria-hidden>
                        📨
                    </span>
                    <span className="admin-tab__label">
                        <span className="admin-tab__name">Cerere angajare</span>
                        <span className="admin-tab__hint">Creare cerere, departament, echipe</span>
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
            {loading && (
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
                            Adăugați utilizatori noi cu rol și parolă. Din tabel: <strong>Editează</strong> modifică datele și
                            rolul; <strong>Șterge</strong> elimină contul (dacă nu este singurul administrator).
                        </p>
                        <div className="admin-btn-group" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="admin-btn-ghost"
                                onClick={() => runRecalcMatch(true)}
                                disabled={loading}
                                title="Recalculează scorul doar pentru aplicările fără scor"
                            >
                                Recalculează scoruri (doar lipsă)
                            </button>
                            <button
                                type="button"
                                className="admin-btn-ghost"
                                onClick={() => runRecalcMatch(false)}
                                disabled={loading}
                                title="Recalculează scorul pentru toate aplicările manuale"
                            >
                                Recalculează scoruri (toate)
                            </button>
                            {recalcInfo && <span className="admin-form__hint">{recalcInfo}</span>}
                        </div>
                    </div>

                    <div className="admin-card">
                        <h3 className="admin-card__title">Utilizator nou</h3>
                        <form className="admin-form-grid" onSubmit={createUtilizator}>
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
                                        value={createForm.departamentId}
                                        onChange={(ev) => setCreateForm((f) => ({ ...f, departamentId: ev.target.value }))}
                                        required
                                    >
                                        <option value="">— Selectați departamentul —</option>
                                        {departamente.map((d) => (
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
                                {utilizatori.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={7} className="admin-table-empty">
                                            Nu există utilizatori afișați. Adăugați primul cont folosind formularul de mai sus.
                                        </td>
                                    </tr>
                                ) : (
                                    utilizatori.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <span className="admin-id">{u.id}</span>
                                            </td>
                                            <td>{u.numeUtilizator}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className="admin-badge">{u.rolDenumire || rolLabel(u.rolCod)}</span>
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
                                                value={editingUser.departamentId || ''}
                                                onChange={(ev) =>
                                                    setEditingUser((x) => ({
                                                        ...x,
                                                        departamentId: ev.target.value ? Number(ev.target.value) : null,
                                                    }))
                                                }
                                            >
                                                <option value="">—</option>
                                                {departamente.map((d) => (
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
                                {departamente.map((d) => {
                                    const mgr = managerDepartamentPentru(d.id, utilizatori)
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
                                })}
                            </tbody>
                        </table>
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
                                        aria-labelledby="admin-manager-label"
                                        value={managerUserId}
                                        onChange={(ev) => setManagerUserId(ev.target.value)}
                                        required
                                    >
                                        <option value="">— Alegeți utilizatorul —</option>
                                        {utilizatori.map((u) => (
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
                        posturi={posturi}
                        recrutoriDto={recrutoriDto}
                        intervievatoriDto={intervievatoriDto}
                        token={token}
                        onRefreshPosturi={loadAll}
                        allowDeletePost
                        embeddedInAdmin
                    />
                </section>
            )}

            {tab === 'cerere-angajare' && (
                <AdminCerereAngajare
                    token={token}
                    departamente={departamente}
                    onCreated={loadAll}
                />
            )}
        </div>
    )
}
