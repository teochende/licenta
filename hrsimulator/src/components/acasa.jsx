import JobDisponibil from "./job_disponibil"
export default function Acasa() {

    let jsonPosturiDisponibile = [
        {
            id: 1001,
            domeniu: "Programare",
            subdomeniu: "Java",
            nume: "POST 1001",
            nivel: "Senior",
            descriere: "Descriere POST 1001"
        },
        {
            id: 1002,
            domeniu: "Contabilitate",
            subdomeniu: "Gestiune",
            nume: "POST 1002",
            nivel: "Senior",
            descriere: "Descriere POST 1002"
        },
        {
            id: 1003,
            domeniu: "Programare",
            subdomeniu: "JavaScript",
            nume: "POST 1003",
            nivel: "Senior",
            descriere: "Descriere POST 1003"
        },
        {
            id: 1004,
            domeniu: "Programare",
            subdomeniu: "Python",
            nume: "POST 1004",
            nivel: "Intermediar",
            descriere: "Descriere POST 1004"
        }
    ]

    return(
        <>
            <h1>Pozitii disponibile</h1>
            <div>
                Filtrare: 
                <select style={{margin:"2px"}}>
                    <option>Programare</option>
                    <option>Contabilitate</option>
                </select>
                <select style={{margin:"2px"}}>
                    <option>Gestiune</option>
                    <option>Java</option>
                    <option>JavaScript</option>
                    <option>Python</option>
                </select>
                <select style={{margin:"2px"}}>
                    <option>Senior</option>
                    <option>Intermediar</option>
                    <option>Junior</option>
                </select>
            </div>
            {jsonPosturiDisponibile.map(el => <JobDisponibil key={el.id} informatiiPost={el}/>)}
            
        </>
    )
}