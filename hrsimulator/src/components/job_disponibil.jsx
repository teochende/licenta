import {useNavigate} from "react-router-dom";
import { useState } from "react"
export default function JobDisponibil( {informatiiPost} ) {
    // informatii post va fi primit ca props de la componenta Acasa, care la randul sau il primeste din jsonPosturiDisponibile
    const navigate = useNavigate()
    const[descriereExtpandata, setDescriereExpandata] = useState(false)
    const cuvinteDescriere = informatiiPost.descriere.trim().split(/\s+/)   // impart descrierea in cuvinte,  pentru a putea afisa doar
                                                                            // primele 20 cuvinte daca descrierea este prea lunga
    const areDescriereLunga = cuvinteDescriere.length > 20
    const descrereScurtata = areDescriereLunga ? cuvinteDescriere.slice(0, 20).join(" ") + "..." : informatiiPost.descriere // daca descrierea are mai mult de 20 de cuvinte, o scurtez la primele 20 de cuvinte urmate de "..."
    const descriereAfisata = descriereExtpandata ? informatiiPost.descriere : descrereScurtata  // daca descrierea este expandata (valoare true), afisez descrierea completa, altfel afisez descrierea scurtata
    
    //console.log("JobDispobibil props", props)
    //console.log("JobDispobibil props.informatiiPost", props.informatiiPost)
    //console.log("JobDispobibil props.informatiiPost.id", props.informatiiPost.id)
    return(
        <div className="optiuneJob">

            <div className="informatiiJob">
                <h3>{informatiiPost.nume}</h3>
                <p> {informatiiPost.domeniu} | {informatiiPost.subdomeniu} | {informatiiPost.nivel}</p>
                {descriereAfisata}
                {areDescriereLunga && (
                    <span 
                        className="toggleDescriere"

                        onClick={() => setDescriereExpandata(!descriereExtpandata)}>
                        {descriereExtpandata ? "show less" : "show more"}
                    </span>
                )}
            </div>
            <div className="divAplicaJob">
                <button className="aplicaJob" onClick={() => navigate('/aplicare-job',
                    { state: {jobSelectat: informatiiPost } })}>Aplica</button>
            </div>
        </div>
    )
}

/*
  height:2rem;
  vertical-align: middle;
  align-content: center;
 */