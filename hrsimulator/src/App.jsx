// in directorul de dezvoltare manuala
// a doua linie pt test branch-uri diferite
import { useState } from 'react'
//import { useStorageState } from "react-storage-hooks"
import { useMyLocalStorage } from './utils/my_hooks'
import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import './App.css'

import LoginContext, { ROLURI } from './context/login_context'

import Toolbar from './components/toolbar/toolbar'

import Acasa from './components/acasa'
import AdministrarePosturi from './components/administrare_posturi'
import AdaugarePost from './components/AdaugarePost'
import Login from './components/login'
import PaginaInexistenta from './components/PaginaInexistenta'
import AplicareJob from './components/aplicare_job'
import Dashboard from './components/Dashboard'
import CerereAngajare from './components/CerereAngajare'
import CereriList from './components/CereriList'
import PosturiDepartament from './components/PosturiDepartament'


const initialPosturi = [
  { id: 1001, domeniu: 'Programare', subdomeniu: 'Java', nume: 'POST 1001', nivel: 'Senior', descriere: 'Descriere POST 1001', enabled: true, assignedRecruteri: ['utest'], assignedIntervievatori: ['itest'] },
  { id: 1002, domeniu: 'Contabilitate', subdomeniu: 'Gestiune', nume: 'POST 1002', nivel: 'Senior', descriere: 'Descriere POST 1002', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1003, domeniu: 'Programare', subdomeniu: 'JavaScript', nume: 'POST 1003', nivel: 'Senior', descriere: 'Descriere POST 1003', enabled: true, assignedRecruteri: ['atest'], assignedIntervievatori: ['itest'] },
  { id: 1004, domeniu: 'Programare', subdomeniu: 'Python', nume: 'POST 1004', nivel: 'Intermediar', descriere: 'Descriere POST 1004', enabled: false, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1005, domeniu: 'Programare', subdomeniu: 'React', nume: 'POST 1005', nivel: 'Intermediar', descriere: 'Descriere POST 1005', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1006, domeniu: 'Programare', subdomeniu: 'C#', nume: 'POST 1006', nivel: 'Senior', descriere: 'Descriere POST 1006', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1007, domeniu: 'Programare', subdomeniu: 'TypeScript', nume: 'POST 1007', nivel: 'Junior', descriere: 'Descriere POST 1007', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1008, domeniu: 'Programare', subdomeniu: 'Node.js', nume: 'POST 1008', nivel: 'Intermediar', descriere: 'Descriere POST 1008', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] },
  { id: 1009, domeniu: 'Programare', subdomeniu: 'Go', nume: 'POST 1009', nivel: 'Senior', descriere: 'Descriere POST 1009', enabled: true, assignedRecruteri: [], assignedIntervievatori: [] }
]

const INTERVIEVATORI_TEHNICI = ['itest']
const RECRUTORI = ['utest', 'atest']

function App() {
  const [count, setCount] = useState(0)
  const [posturi, setPosturi] = useState(initialPosturi)
  const [cereriDeAngajare, setCereriDeAngajare] = useState([])

  const [user, setUser] = useMyLocalStorage("user-autentificat", {})

  const utilizatoriHardcodati = [
    { user: 'utest', parola: 'ptest', rol: ROLURI.RECRUTOR },
    { user: 'itest', parola: 'iparola', rol: ROLURI.INTERVIEVATOR_TEHNIC },
    { user: 'atest', parola: 'aparaola', rol: ROLURI.RECRUTOR },
    { user: 'mrtest', parola: 'mrparola', rol: ROLURI.MANAGER_RECRUTARE },
    { user: 'mdtest', parola: 'mdparola', rol: ROLURI.MANAGER_DEPARTAMENT, departament: 'Programare' }
  ]

  const onLogin = (username, parola) => {
    const gasit = utilizatoriHardcodati.find(
      (u) => u.user === username && u.parola === parola
    )
    if (gasit) {
      setUser({
        nume: username,
        isAuthenticated: true,
        rol: gasit.rol,
        departament: gasit.departament || ''
      })
      return 1
    }
    console.error("Din App onLogin: User sau parola gresite!")
    return 0
  }

  const adaugaCerere = (cerere) => {
    setCereriDeAngajare((prev) => [
      ...prev,
      { ...cerere, id: Date.now(), status: 'pending' }
    ])
  }

  const deschidePostDinCerere = (cerereId, recruteriSelectati) => {
    const cerere = cereriDeAngajare.find((c) => c.id === cerereId)
    if (!cerere) return
    const nextId = Math.max(0, ...posturi.map((p) => p.id)) + 1
    setPosturi((prev) => [
      ...prev,
      {
        id: nextId,
        domeniu: cerere.departament,
        subdomeniu: '—',
        nume: cerere.numePost,
        nivel: '—',
        descriere: cerere.descriere || 'Descriere de completat.',
        enabled: true,
        assignedRecruteri: recruteriSelectati || [],
        assignedIntervievatori: cerere.intervievatoriTehnici || []
      }
    ])
    setCereriDeAngajare((prev) =>
      prev.map((c) => (c.id === cerereId ? { ...c, status: 'deschis' } : c))
    )
  }

  const onLogout = () => {
    setUser({
      nume: ``,
      isAuthenticated: false,
      rol: ``,
      departament: ``
    })
  }

  console.log("useraitentificat:", user)

  return (
    <>
      <Router>
        <h1>Simulator HR</h1>
        <LoginContext.Provider value={{ user, onLogout }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Acasa posturi={posturi} />} />
            <Route path="/aplicare-job" element={<AplicareJob />} />

            <Route path="/cerere-angajare" element={user.isAuthenticated && user.rol === ROLURI.MANAGER_DEPARTAMENT ? <CerereAngajare onTrimite={adaugaCerere} departament={user.departament} /> : <PaginaInexistenta />} />
            <Route path="/posturi-departament" element={user.isAuthenticated && user.rol === ROLURI.MANAGER_DEPARTAMENT ? <PosturiDepartament posturi={posturi} setPosturi={setPosturi} departament={user.departament} intervievatoriDisponibili={INTERVIEVATORI_TEHNICI} /> : <PaginaInexistenta />} />
            <Route path="/cereri" element={user.isAuthenticated && user.rol === ROLURI.MANAGER_RECRUTARE ? <CereriList cereri={cereriDeAngajare} onDeschidePost={deschidePostDinCerere} recrutori={RECRUTORI} /> : <PaginaInexistenta />} />

            <Route path="/administrare-posturi" element={user.isAuthenticated && user.rol === ROLURI.MANAGER_RECRUTARE ? <AdministrarePosturi posturi={posturi} setPosturi={setPosturi} recrutori={RECRUTORI} intervievatori={INTERVIEVATORI_TEHNICI} /> : <PaginaInexistenta />} />
            <Route path="/administrare-posturi/adaugare" element={user.isAuthenticated && user.rol === ROLURI.MANAGER_RECRUTARE ? <AdaugarePost posturi={posturi} onAdaugaPost={(p) => setPosturi(prev => [...prev, { ...p, assignedRecruteri: [], assignedIntervievatori: [] }])} /> : <PaginaInexistenta />} />

            <Route path="/dashboard" element={user.isAuthenticated ? <Dashboard posturi={posturi} setPosturi={setPosturi} user={user} /> : <Navigate to="/login" />} />

            <Route path="/login" element={!user.isAuthenticated ? <Login onLogin={onLogin} /> : (user.rol === ROLURI.MANAGER_RECRUTARE ? <Navigate to="/administrare-posturi" /> : <Navigate to="/dashboard" />)} />

            <Route path="*" element={<PaginaInexistenta />} />
          </Routes>
        </LoginContext.Provider>
      </Router>
       
    </>
  )
}

export default App
