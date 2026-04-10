import { useState } from 'react'
import { putIntervievatoriTehnici } from '../api/postsApi'
import './PosturiDepartament.css'

export default function PosturiDepartament({
    posturi = [],
    departament,
    token,
    onRefresh,
    intervievatoriDto = [],
}) {
    const [modalPostId, setModalPostId] = useState(null)
    const [selectati, setSelectati] = useState([])

    const posturiDepartament = posturi.filter((p) => p.domeniu === departament)

    const deschideModal = (post) => {
        setModalPostId(post.id)
        const numeCurenti = post.assignedIntervievatori || []
        const ids = intervievatoriDto
            .filter((o) => numeCurenti.includes(o.numeUtilizator))
            .map((o) => o.id)
        setSelectati(ids)
    }

    const inchideModal = () => {
        setModalPostId(null)
        setSelectati([])
    }

    const toggleIntervievator = (id) => {
        setSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const salveaza = async () => {
        if (modalPostId == null || !token) return
        try {
            await putIntervievatoriTehnici(token, modalPostId, selectati)
            await onRefresh?.()
            inchideModal()
        } catch (e) {
            alert(e?.message || 'Eroare la salvare.')
        }
    }

    return (
        <div className="posturi-departament">
            <h1>Posturi departament – {departament}</h1>
            <p className="posturi-departament-desc">
                Atribuiți intervievatori tehnici pentru posturile din departamentul dvs.
            </p>
            {posturiDepartament.length === 0 ? (
                <p className="posturi-departament-gol">Nu există posturi în acest departament.</p>
            ) : (
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nume</th>
                            <th>Subdomeniu</th>
                            <th>Nivel</th>
                            <th>Intervievatori tehnici</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posturiDepartament.map((post) => (
                            <tr key={post.id}>
                                <td>{post.id}</td>
                                <td>{post.nume}</td>
                                <td>{post.subdomeniu}</td>
                                <td>{post.nivel}</td>
                                <td>{(post.assignedIntervievatori || []).join(', ') || '—'}</td>
                                <td>
                                    <button
                                        type="button"
                                        className="toggle-btn edit-btn"
                                        onClick={() => deschideModal(post)}
                                    >
                                        Atribuie / modifică intervievatori
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {modalPostId != null && (
                <div className="posturi-departament-overlay" onClick={inchideModal}>
                    <div className="posturi-departament-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Intervievatori tehnici atribuiți</h3>
                        <p className="posturi-departament-modal-info">
                            Selectați unul sau mai mulți intervievatori pentru acest post.
                        </p>
                        <div className="posturi-departament-checkbox-list">
                            {intervievatoriDto.map((u) => (
                                <label key={u.id} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectati.includes(u.id)}
                                        onChange={() => toggleIntervievator(u.id)}
                                    />
                                    {u.numeUtilizator}
                                </label>
                            ))}
                        </div>
                        <div className="posturi-departament-modal-btns">
                            <button type="button" className="btn btn-anulare" onClick={inchideModal}>
                                Anulare
                            </button>
                            <button type="button" className="btn btn-salvare" onClick={salveaza}>
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
