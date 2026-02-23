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

import LoginContext from './context/login_context'

import Toolbar from './components/toolbar/toolbar'

import Acasa from './components/acasa'
import AdministrarePosturi from './components/administrare_posturi'
import Login from './components/login'
import PaginaInexistenta from './components/PaginaInexistenta'

function App() {
  const [count, setCount] = useState(0)

  //const [user, setUser] = useState({})
  const [user, setUser] = useMyLocalStorage("user-autentificat", {})

  const onLogin = (username, parola) => {
    if(username === 'utest' && parola === 'ptest') {
      setUser({
        nume: username,
        isAuthenticated: true 
      })
      return 1
    }
    console.error("Din App onLogin: User sau parola gresite!")
    return 0

  }

  const onLogout = () => {
    setUser({ 
      nume: ``,
      isAuthenticated: false
    })
  }

  console.log("useraitentificat:", user)

  return (
    <>
      <Router>
        <h1>Simulator HR</h1>
        <LoginContext value={{user: user, onLogout: onLogout}}>
          <Toolbar/>
          <Routes>
            <Route path="/" element={<Acasa/>}/>
            <Route path="/administrare-posturi" element={ user.isAuthenticated ? <AdministrarePosturi/> : <PaginaInexistenta />}/>
            <Route path="/login" element={!user.isAuthenticated ? <Login onLogin={onLogin}/> : <Navigate to="/administrare-posturi"/>}/>

            <Route path="*" element={<PaginaInexistenta />} />
          </Routes>
        </LoginContext>
      </Router>
       
    </>
  )
}

export default App
