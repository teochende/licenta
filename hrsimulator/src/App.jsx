import { useState, useEffect, useCallback } from 'react'
import { useMyLocalStorage } from './utils/my_hooks'
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'
import './App.css'

import LoginContext, { ROLURI } from './context/login_context'
import { mapProfileToUser } from './api/mapUser'
import * as authApi from './api/authApi'
import * as postsApi from './api/postsApi'
import { getRecrutori, getIntervievatoriTehnici } from './api/hrMetaApi'
import { getCereriPending, deschidePostDinCerere } from './api/cereriApi'

import Toolbar from './components/toolbar/toolbar'
import Acasa from './components/acasa'
import AdministrarePosturi from './components/administrare_posturi'
import AdminPanel from './components/AdminPanel'
import AdaugarePost from './components/AdaugarePost'
import Login from './components/login'
import Register from './components/Register'
import ContInAsteptare from './components/ContInAsteptare'
import PaginaInexistenta from './components/PaginaInexistenta'
import AplicareJob from './components/aplicare_job'
import Dashboard from './components/Dashboard'
import CerereAngajare from './components/CerereAngajare'
import CereriList from './components/CereriList'
import CereriMele from './components/CereriMele'
import PosturiDepartament from './components/PosturiDepartament'

const defaultUser = {
    isAuthenticated: false,
    nume: '',
    rol: '',
    token: null,
    departament: '',
    departamentId: null,
    id: null,
    email: '',
    numeUtilizator: '',
    rolDoritCod: null,
    rolDoritDenumire: null,
}

function App() {
    const [user, setUser] = useMyLocalStorage('user-autentificat', defaultUser)
    const [posturi, setPosturi] = useState([])
    const [recrutoriDto, setRecrutoriDto] = useState([])
    const [intervievatoriDto, setIntervievatoriDto] = useState([])
    const [cereriPending, setCereriPending] = useState([])

    const refreshPosturi = useCallback(async () => {
        if (!user.isAuthenticated || !user.token) {
            setPosturi([])
            return
        }
        try {
            const data = await postsApi.getPosturi(user.token)
            setPosturi(Array.isArray(data) ? data : [])
        } catch {
            setPosturi([])
        }
    }, [user.isAuthenticated, user.token])

    useEffect(() => {
        refreshPosturi()
    }, [refreshPosturi])

    useEffect(() => {
        async function validateSession() {
            if (!user?.token) return
            try {
                const me = await authApi.meRequest(user.token)
                setUser(mapProfileToUser(me, user.token))
            } catch {
                setUser(defaultUser)
            }
        }
        if (user?.token && user.isAuthenticated) {
            validateSession()
        }
    }, [])

    useEffect(() => {
        async function loadHrMeta() {
            if (!user.token || !user.isAuthenticated) {
                setRecrutoriDto([])
                setIntervievatoriDto([])
                return
            }
            try {
                const [r, i] = await Promise.all([
                    getRecrutori(user.token).catch(() => []),
                    getIntervievatoriTehnici(user.token).catch(() => []),
                ])
                setRecrutoriDto(Array.isArray(r) ? r : [])
                setIntervievatoriDto(Array.isArray(i) ? i : [])
            } catch {
                setRecrutoriDto([])
                setIntervievatoriDto([])
            }
        }
        loadHrMeta()
    }, [user.token, user.isAuthenticated])

    useEffect(() => {
        async function loadCereri() {
            if (
                !user.token ||
                (user.rol !== ROLURI.MANAGER_RECRUTARE && user.rol !== ROLURI.ADMIN)
            ) {
                setCereriPending([])
                return
            }
            try {
                const c = await getCereriPending(user.token)
                setCereriPending(Array.isArray(c) ? c : [])
            } catch {
                setCereriPending([])
            }
        }
        loadCereri()
    }, [user.token, user.rol])

    const refreshCereri = useCallback(async () => {
        if (!user.token || (user.rol !== ROLURI.MANAGER_RECRUTARE && user.rol !== ROLURI.ADMIN)) return
        try {
            const c = await getCereriPending(user.token)
            setCereriPending(Array.isArray(c) ? c : [])
        } catch {
            setCereriPending([])
        }
    }, [user.token, user.rol])

    const onLogin = async (email, parola) => {
        const res = await authApi.loginRequest(email, parola)
        const token = res.accessToken
        const me = await authApi.meRequest(token)
        setUser(mapProfileToUser(me, token))
        return true
    }

    const onRegister = async ({ numeUtilizator, email, parola, rolDorit }) => {
        await authApi.registerRequest({
            numeUtilizator,
            email,
            parola,
            rolDorit,
        })
        await onLogin(email, parola)
    }

    const onLogout = () => {
        setUser(defaultUser)
        setPosturi([])
    }

    const handleDeschidePostDinCerere = async (cerereId, recrutoriIds) => {
        await deschidePostDinCerere(user.token, cerereId, recrutoriIds)
        await refreshCereri()
        await refreshPosturi()
    }

    const saveDescriereJob = async (jobId, descriere) => {
        await postsApi.patchPost(user.token, jobId, { descriere })
        await refreshPosturi()
    }

    const isMd = user.rol === ROLURI.MANAGER_DEPARTAMENT || user.rol === ROLURI.ADMIN
    const isMr = user.rol === ROLURI.MANAGER_RECRUTARE || user.rol === ROLURI.ADMIN
    const isGuest = user.isAuthenticated && user.rol === ROLURI.GUEST

    return (
        <>
            <Router>
                <h1>Simulator HR</h1>
                <LoginContext.Provider value={{ user, onLogout }}>
                    <Toolbar />
                    <Routes>
                        <Route path="/" element={<Acasa />} />
                        <Route path="/aplicare-job" element={<AplicareJob />} />

                        <Route
                            path="/cerere-angajare"
                            element={
                                user.isAuthenticated && isMd ? (
                                    <CerereAngajare token={user.token} />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />
                        <Route
                            path="/posturi-departament"
                            element={
                                user.isAuthenticated && isMd ? (
                                    <PosturiDepartament
                                        posturi={posturi}
                                        departament={user.departament}
                                        token={user.token}
                                        onRefresh={refreshPosturi}
                                        intervievatoriDto={intervievatoriDto}
                                    />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />
                        <Route
                            path="/cereri"
                            element={
                                user.isAuthenticated && isMr ? (
                                    <CereriList
                                        cereri={cereriPending}
                                        onDeschidePost={handleDeschidePostDinCerere}
                                        recrutoriDto={recrutoriDto}
                                        intervievatoriDto={intervievatoriDto}
                                        token={user.token}
                                        onRefreshCereri={refreshCereri}
                                    />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />
                        <Route
                            path="/cererile-mele"
                            element={
                                user.isAuthenticated && isMd ? (
                                    <CereriMele token={user.token} isAdmin={user.rol === ROLURI.ADMIN} />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />

                        <Route
                            path="/admin"
                            element={
                                user.isAuthenticated && user.rol === ROLURI.ADMIN ? (
                                    <AdminPanel token={user.token} />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />

                        <Route
                            path="/administrare-posturi"
                            element={
                                user.isAuthenticated && isMr ? (
                                    <AdministrarePosturi
                                        posturi={posturi}
                                        recrutoriDto={recrutoriDto}
                                        intervievatoriDto={intervievatoriDto}
                                        token={user.token}
                                        onRefreshPosturi={refreshPosturi}
                                    />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />
                        <Route
                            path="/administrare-posturi/adaugare"
                            element={
                                user.isAuthenticated && isMr ? (
                                    <AdaugarePost token={user.token} onCreated={refreshPosturi} />
                                ) : (
                                    <PaginaInexistenta />
                                )
                            }
                        />

                        <Route
                            path="/dashboard"
                            element={
                                !user.isAuthenticated ? (
                                    <Navigate to="/login" />
                                ) : isGuest ? (
                                    <Navigate to="/cont-in-asteptare" />
                                ) : (
                                    <Dashboard
                                        posturi={posturi}
                                        setPosturi={setPosturi}
                                        user={user}
                                        authToken={user.token}
                                        onRemoteSaveDescriere={saveDescriereJob}
                                        onRefreshPosturi={refreshPosturi}
                                    />
                                )
                            }
                        />

                        <Route
                            path="/cont-in-asteptare"
                            element={<ContInAsteptare />}
                        />

                        <Route
                            path="/login"
                            element={
                                !user.isAuthenticated ? (
                                    <Login onLogin={onLogin} />
                                ) : user.rol === ROLURI.GUEST ? (
                                    <Navigate to="/cont-in-asteptare" />
                                ) : user.rol === ROLURI.ADMIN ? (
                                    <Navigate to="/admin" />
                                ) : user.rol === ROLURI.MANAGER_RECRUTARE ? (
                                    <Navigate to="/administrare-posturi" />
                                ) : (
                                    <Navigate to="/dashboard" />
                                )
                            }
                        />

                        <Route
                            path="/register"
                            element={
                                user.isAuthenticated ? (
                                    user.rol === ROLURI.GUEST ? (
                                        <Navigate to="/cont-in-asteptare" />
                                    ) : user.rol === ROLURI.ADMIN ? (
                                        <Navigate to="/admin" />
                                    ) : user.rol === ROLURI.MANAGER_RECRUTARE ? (
                                        <Navigate to="/administrare-posturi" />
                                    ) : (
                                        <Navigate to="/dashboard" />
                                    )
                                ) : (
                                    <Register onRegistered={onRegister} />
                                )
                            }
                        />

                        <Route path="*" element={<PaginaInexistenta />} />
                    </Routes>
                </LoginContext.Provider>
            </Router>
        </>
    )
}

export default App
