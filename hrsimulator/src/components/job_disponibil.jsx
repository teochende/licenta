import {useNavigate} from "react-router-dom";
import { useState } from "react"
export default function JobDisponibil( {informatiiPost} ) {
    // informatii post va fi primit ca props de la componenta Acasa, care la randul sau il primeste din jsonPosturiDisponibile
    const navigate = useNavigate()
    const[descriereExtpandata, setDescriereExpandata] = useState(false)
    const descriere = (informatiiPost?.descriere != null ? String(informatiiPost.descriere) : '').trim()
    const areDescriere = descriere.length > 0
    const areDescriereLunga = descriere.length > 360 || (descriere.match(/\n/g) || []).length >= 6
    
    //console.log("JobDispobibil props", props)
    //console.log("JobDispobibil props.informatiiPost", props.informatiiPost)
    //console.log("JobDispobibil props.informatiiPost.id", props.informatiiPost.id)
    return(
        <div className="optiuneJob">

            <div className="informatiiJob">
                <h3 className="job-titlu">{informatiiPost.nume}</h3>
                <p className="job-meta">
                    <span className="job-meta__pill">{informatiiPost.domeniu}</span>
                    <span className="job-meta__sep">•</span>
                    <span className="job-meta__pill">{informatiiPost.subdomeniu}</span>
                    <span className="job-meta__sep">•</span>
                    <span className="job-meta__pill">{informatiiPost.nivel}</span>
                </p>
                {areDescriere ? (
                    <div
                        className={`job-descriere ${descriereExtpandata ? 'job-descriere--expanded' : 'job-descriere--collapsed'}`}
                    >
                        {descriere}
                        {!descriereExtpandata && areDescriereLunga ? (
                            <button
                                type="button"
                                className="job-descriere-toggle-inline"
                                onClick={() => setDescriereExpandata(true)}
                            >
                                show more
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <p className="job-descriere job-descriere--empty">—</p>
                )}
                {areDescriereLunga && descriereExtpandata && (
                    <button
                        type="button"
                        className="toggleDescriere"
                        onClick={() => setDescriereExpandata(false)}
                    >
                        show less
                    </button>
                )}
            </div>
            <div className="divAplicaJob">
                <button
                    className="aplicaJob"
                    onClick={() => navigate('/aplicare-job', { state: { jobSelectat: informatiiPost } })}
                >
                    Aplică
                </button>
            </div>
        </div>
    )
}

/*
  height:2rem;
  vertical-align: middle;
  align-content: center;
 */