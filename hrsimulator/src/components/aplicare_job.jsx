import { Link, useLocation } from "react-router-dom"
import { useState, useRef } from "react"
import "./aplicare_job.css"

export default function AplicareJob() {
    const {state} = useLocation();            // preiau informatiile despre jobul selectat din starea transmisa prin navigare
    console.log("AplicareJob state", state)

    const jobSelectat = state ? state.jobSelectat : null;   // extrag informatiile despre jobul selectat din starea transmisa prin navigare
    const [nume, setNume] = useState("");
    const [email, setEmail] = useState("");
    const [cv, setCv] = useState(null);
    const [cvError, setCvError] = useState("");
    const inputCvRef = useRef(null);
    
    const handleCvChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
            if (!allowedTypes.includes(file.type)) {
                setCvError("Doar fișiere PDF sau DOCX sunt permise.");
                setCv(null);
                return;
            }
            setCv(file);
            setCvError("");
        } else {
            setCv(null);
            setCvError("");
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!cv) {
            setCvError("Te rugăm să încarci un CV (PDF sau DOCX).");
            return;
        }
        // aici poti adauga logica pentru trimiterea aplicarii si a fisierului
        alert(`Aplicarea a fost trimisa pentru ${jobSelectat.nume}.\nCV: ${cv.name}`)
        setNume("")
        setEmail("")
        setCv(null)
        setCvError("")
        if (inputCvRef.current) inputCvRef.current.value = ""  // golim si input-ul de tip file (altfel ramane numele fisierului afisat)
    }

    // daca nu am niciun jobSlelectat, afisez un mesaj de eroare -> situatie care apare cand dau refresh pe pagina de aplicare job
    if(!jobSelectat) {
        return (
            <>
                <h2>Aplicare pentru job</h2>
                <p>Nu a fost selectat niciun post.</p>
                <Link to="/">Inapoi la posturi</Link>
            </>
            
        )
    }
    return (
        <>
            <h2>Aplicare pentru job</h2>
            
            <div className="optiuneJob">
                <div className="informatiiJob">
                    <h3>{jobSelectat.nume}</h3>
                    <p> {jobSelectat.domeniu} | {jobSelectat.subdomeniu} | {jobSelectat.nivel}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="formularAplicare" encType="multipart/form-data">
                <div className="campAplicarePrimul">
                    <label htmlFor="nume-candidat">Nume</label>
                    <br/>
                    <input
                        type="text" 
                        id="nume-candidat"
                        value={nume}
                        onChange={event => setNume(event.target.value)} 
                        required
                    />
                </div>
                <div className="campAplicare">
                    <label htmlFor="email-candidat">Email</label>
                    <br/>
                    <input
                        type="email" 
                        id="email-candidat"
                        value={email}
                        onChange={event => setEmail(event.target.value)} 
                        required
                    />
                </div>

                <div className="campAplicare">
                    <label htmlFor="cv-candidat">CV (PDF sau DOCX)</label>
                    <br/>
                    <input
                        ref={inputCvRef}
                        type="file"
                        id="cv-candidat"
                        accept=".pdf,.docx,.doc"
                        onChange={handleCvChange}
                    />
                    {cv && <span style={{marginLeft: "0.5rem"}}>Fișier selectat: {cv.name}</span>}
                    {cvError && <div style={{color: "red"}}>{cvError}</div>}
                </div>

                <button className="butonTrimiteAplicare" type="submit">Trimite aplicare</button>

            </form>
        </>
    )
}