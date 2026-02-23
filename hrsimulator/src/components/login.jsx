
import {useEffect, useState, useContext } from "react"
import LoginContext from "../context/login_context"


export default function Login(props) { // Login({onLogin})
    const [lnume, setNume] = useState("");
    const [parola, setParola] = useState("");
    const [infoform, setInfoForm] = useState(""); // pt msg informare

    const onLogin = props.onLogin

    const {nume, isAuthenticated} = useContext(LoginContext)

    useEffect(() => {
        //console.log('lnume:', lnume)

        //return(console.log("Clean up dupa useEffect lnume"))
    }, [lnume])
    
    useEffect(() => {
        //console.log("parola", parola)
    }, [parola])
    

    function handleLogin(event) {
        event.preventDefault()
        setNume("");
        setParola("");
        console.log("login", lnume, parola);
        if(!onLogin(lnume, parola)) {
            setInfoForm("User sau parola gresite")
        } else {
            setInfoForm("")
        }
    } 

    return(
        <>
            <h3>Login</h3>
            <form onSubmit={handleLogin} style={{display:"block"}}>
                <table>
                    <tbody>
                    <tr>
                        <td>
                            <label htmlFor="id_nume">Nume</label>
                        </td>
                        <td>
                            <input type="text" name="lnume" id="id_nume" value={lnume}
                                onChange={event => setNume(event.target.value)}
                            />
                        </td>
                    </tr>
                
                    <tr>
                        <td>
                            <label htmlFor="id_pass">Parola</label>
                        </td>
                        <td>
                            <input type="password" name="password" id="id_pass" value={parola}
                                onChange={event => setParola(event.target.value)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td></td>
                        <td><input value="Trimite" type="submit"/></td>
                    </tr>
                    </tbody>
                </table>
            </form>
            {infoform}
        </>
    )
}

/*
    return(
        <>
            <h1>Login</h1>
            <form onSubmit={handleLogin} style={{display:"block"}}>
                <table>
                    <tbody>
                    <tr>
                        <td>
                            <label htmlFor="id_nume">Nume</label>
                        </td>
                        <td>
                            <input type="text" name="nume" id="id_nume" value={nume}
                                onChange={event => setNume(event.target.value)}
                            />
                        </td>
                    </tr>
                
                    <tr>
                        <td>
                            <label htmlFor="id_pass">Parola</label>
                        </td>
                        <td>
                            <input type="password" name="password" id="id_pass" value={parola}
                                onChange={event => setParola(event.target.value)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td></td>
                        <td><input value="Trimite" type="submit" disabled={!nume || !parola}/></td>
                    </tr>
                    </tbody>
                </table>
            </form>
            ati tastat: {infoform}
        </>
    )
*/