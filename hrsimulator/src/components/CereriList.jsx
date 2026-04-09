import { useState } from 'react'
import './CereriList.css'

export default function CereriList({ cereri, onDeschidePost, recrutori = [] }) {
    const [modalCerereId, setModalCerereId] = useState(null)
    const [recruteriSelectati, setRecruteriSelectati] = useState([])

    const cereriPending = cereri.filter((c) => c.status === 'pending')

    const openModal = (cerereId) => {
        setModalCerereId(cerereId)
        setRecruteriSelectati([])
    }

    const closeModal = () => {
        setModalCerereId(null)
        setRecruteriSelectati([])
    }

    const toggleRecrutor = (r) => {
        setRecruteriSelectati((prev) =>
            prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
        )
    }

    const handleDeschide = () => {
        if (modalCerereId != null) {
            onDeschidePost(modalCerereId, recruteriSelectati)
            closeModal()
        }
    }

    return (
        <div className="cereri-list">
            <h1>Cereri de angajare</h1>
            <p className="cereri-descriere">Cererile primite de la managerii de departament. Puteți deschide un post pentru aplicare și atribui recruteri.</p>
            {cereriPending.length === 0 ? (
                <p className="cereri-gol">Nu există cereri în așteptare.</p>
            ) : (
                <ul className="cereri-ul">
                    {cereriPending.map((c) => (
                        <li key={c.id} className="cerere-item">
                            <div className="cerere-item-content">
                                <strong>{c.numePost}</strong>
                                <span className="cerere-meta">Departament: {c.departament} | Poziții: {c.nrPozitii}</span>
                                {c.descriere && <p className="cerere-descriere-scurta">{c.descriere}</p>}
                                {c.intervievatoriTehnici?.length > 0 && (
                                    <span className="cerere-interv">Intervievatori: {c.intervievatoriTehnici.join(', ')}</span>
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
                        <h3>Atribuie recruteri postului</h3>
                        <p className="cereri-modal-info">Selectați unul sau mai mulți recruteri pentru acest post.</p>
                        <div className="checkbox-list">
                            {recrutori.map((r) => (
                                <label key={r} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={recruteriSelectati.includes(r)}
                                        onChange={() => toggleRecrutor(r)}
                                    />
                                    {r}
                                </label>
                            ))}
                        </div>
                        <div className="cereri-modal-btns">
                            <button type="button" className="btn btn-anulare" onClick={closeModal}>
                                Anulare
                            </button>
                            <button type="button" className="btn btn-confirma" onClick={handleDeschide}>
                                Deschide post și atribuie recruteri
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
