export default function JobDisponibil( {informatiiPost} ) {
    //console.log("JobDispobibil props", props)
    //console.log("JobDispobibil props.informatiiPost", props.informatiiPost)
    //console.log("JobDispobibil props.informatiiPost.id", props.informatiiPost.id)
    return(
        <div className="optiuneJob">

            <div className="informatiiJob">
                <h3>{informatiiPost.nume}</h3>
                <p> {informatiiPost.domeniu} | {informatiiPost.subdomeniu} | {informatiiPost.nivel}</p>
                <p> {informatiiPost.descriere} </p>
            </div>
            <div className="divAplicaJob">
                <button className="aplicaJob">Aplica</button>
            </div>
        </div>
    )
}

/*
  height:2rem;
  vertical-align: middle;
  align-content: center;
 */