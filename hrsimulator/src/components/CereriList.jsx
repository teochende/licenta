import { useState } from 'react'
import './CereriList.css'

export default function CereriList({ cereri = [], onDeschidePost, recrutoriDto = [] }) {
    const [modalCerereId, setModalCerereId] = useState(null)
    const [recrutoriSelectati, setRecrutoriSelectati] = useState([])

    const cereriPending = cereri.filter((c) => c.status === 'pending')

    const openModal = (cerereId) => {
        setModalCerereId(cerereId)
        setRecrutoriSelectati([])
    }

    const closeModal = () => {
        setModalCerereId(null)
        setRecrutoriSelectati([])
    }

    const toggleRecrutor = (id) => {
        setRecrutoriSelectati((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const handleDeschide = async () => {
        if (modalCerereId == null) return
        try {
            await onDeschidePost?.(modalCerereId, recrutoriSelectati)
            closeModal()
        } catch (e) {
            alert(e?.message || 'Eroare la deschiderea postului.')
        }
    }

    return (
        <div className="cereri-list">
            <h1>Cereri de angajare</h1>
            <p className="cereri-descriere">
                Cererile primite de la managerii de departament. Puteți deschide un post pentru aplicare și atribui
                recrutori.
            </p>
            {cereriPending.length === 0 ? (
                <p className="cereri-gol">Nu există cereri în așteptare.</p>
            ) : (
                <ul className="cereri-ul">
                    {cereriPending.map((c) => (
                        <li key={c.id} className="cerere-item">
                            <div className="cerere-item-content">
                                <strong>{c.numePost}</strong>
                                <span className="cerere-meta">
                                    Departament: {c.departament} | Poziții: {c.nrPozitii}
                                </span>
                                {c.descriere && <p className="cerere-descriere-scurta">{c.descriere}</p>}
                                {c.intervievatoriTehnici?.length > 0 && (
                                    <span className="cerere-interv">
                                        Intervievatori: {c.intervievatoriTehnici.join(', ')}
                                    </span>
                                )}
                            </div>
                            <button type="button" className="btn btn-deschide" onClick={() => openModal(c.id)}>
                                Deschide post
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {modalCerereId != null && (
                <div className="cereri-modal-overlay" onClick={closeModal}>
                    <div className="cereri-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Atribuie recrutori postului</h3>
                        <p className="cereri-modal-info">Selectați unul sau mai mulți recrutori pentru acest post.</p>
                        <div className="checkbox-list">
                            {recrutoriDto.map((r) => (
                                <label key={r.id} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={recrutoriSelectati.includes(r.id)}
                                        onChange={() => toggleRecrutor(r.id)}
                                    />
                                    {r.numeUtilizator}
                                </label>
                            ))}
                        </div>
                        <div className="cereri-modal-btns">
                            <button type="button" className="btn btn-anulare" onClick={closeModal}>
                                Anulare
                            </button>
                            <button type="button" className="btn btn-confirma" onClick={handleDeschide}>
                                Confirmă și deschide post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
