import { useState } from "react"
import JobDisponibil from "./job_disponibil"

export default function Acasa({ posturi = [] }) {
    // Doar posturile active (enabled) din administrare sunt afișate pe pagina de posturi
    const posturiActive = posturi.filter((p) => p.enabled)

    // declarare state pentru cele 3 filtre si settere aferente
    // valori initiale: string gol ""
    const [filtruDomeniu, setFiltruDomeniu] = useState("")
    const [filtruSubdomeniu, setFiltruSubdomeniu] = useState("")
    const [filtruNivel, setFiltruNivel] = useState("")


    // filtrare jsonPosturiDisponibile in functie de cele 3 filtre
    // va determina daca un post din jsonPosturiDisponibile trebuie sa fie afisat sau nu
    const filtreazaPosturi = (posturi) => {
        return posturi.filter(el => {
            if(filtruDomeniu !== "" && el.domeniu !== filtruDomeniu) {
                return false
            }
            if(filtruSubdomeniu !== "" && el.subdomeniu !== filtruSubdomeniu) {
                return false
            }
            if(filtruNivel !== "" && el.nivel !== filtruNivel) {
                return false
            }
            return true
        })
    }
    
    const posturiFiltrate = filtreazaPosturi(posturiActive)

    return(
        <>
            <h1>Pozitii disponibile</h1>
            <div>
                Filtrare: 
                <select style={{margin:"2px"}} value={filtruDomeniu} onChange={e => setFiltruDomeniu(e.target.value)}>
                    <option value=''>Toate domeniile</option>
                    <option value='Programare'>Programare</option>
                    <option>Contabilitate</option>
                </select>

                <select style={{margin:"2px"}} value={filtruSubdomeniu} onChange={e => setFiltruSubdomeniu(e.target.value)}>
                    <option value=''>Toate subdomeniile</option>
                    <option value='Gestiune'>Gestiune</option>
                    <option value='Java'>Java</option>
                    <option value='JavaScript'>JavaScript</option>
                    <option value='Python'>Python</option>
                </select>

                <select style={{margin:"2px"}} value={filtruNivel} onChange={e => setFiltruNivel(e.target.value)}>
                    <option value=''>Toate nivelurile</option>
                    <option value='Senior'>Senior</option>
                    <option value='Intermediar'>Intermediar</option>
                    <option value='Junior'>Junior</option>
                </select>
            </div>
                {posturiFiltrate.map(el => <JobDisponibil key={el.id} informatiiPost={el}/>)}
            {/*
                1. mapam jsonPosturiDisponibile pentru a afisa cate un component JobDisponibil pentru fiecare element din jsonPosturiDisponibile
                2. trecem informatiile despre post ca props catre componenta JobDisponibil (ex: informatiiPost={el})
                3. in componenta JobDisponibil afisam numele, domeniul, subdomeniul, nivelul si descrierea postului
            */}
            {posturiFiltrate.length === 0 && <p>Nu exista posturi disponibile pentru filtrele selectate.</p>}
        </>
    )
}