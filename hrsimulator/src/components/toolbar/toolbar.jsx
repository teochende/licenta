import { useContext } from "react"
import MeniuAcasa from "./componente/meniu_acasa"
import MeniuAdministrarePosturi from "./componente/meniu_administrare_posturi"
import MeniuLogin from "./componente/meniu_login"


import LoginContext from "../../context/login_context"

export default function Toolbar() {

    const {user} = useContext(LoginContext)

    console.log("User din toolbar:", user?.nume, user?.isAuthenticated)
    return(
        <>
        <div className="mainToolbar">
            <div className="grupPrincipal">
                <MeniuAcasa/> 
                {user.isAuthenticated && <MeniuAdministrarePosturi/>}
            </div>
            <div className="grupLogin"> 
                <MeniuLogin/>
            </div>
            
        </div>
        </>
    )
}