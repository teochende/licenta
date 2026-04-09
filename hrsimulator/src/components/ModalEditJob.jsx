import { useState, useEffect } from 'react'
import './ModalEditJob.css'

export default function ModalEditJob({ job, onSave, onClose, recrutoriDisponibili = [], intervievatoriDisponibili = [] }) {
    const [formData, setFormData] = useState(null)

    useEffect(() => {
        if (job) {
            setFormData({
                ...job,
                assignedRecruteri: Array.isArray(job.assignedRecruteri) ? [...job.assignedRecruteri] : [],
                assignedIntervievatori: Array.isArray(job.assignedIntervievatori) ? [...job.assignedIntervievatori] : []
            })
        }
    }, [job])

    const handleChange = (camp, valoare) => {
        setFormData((prev) => (prev ? { ...prev, [camp]: valoare } : null))
    }

    const toggleRecrutor = (username) => {
        setFormData((prev) => {
            if (!prev) return prev
            const list = prev.assignedRecruteri || []
            const next = list.includes(username) ? list.filter((u) => u !== username) : [...list, username]
            return { ...prev, assignedRecruteri: next }
        })
    }

    const toggleIntervievator = (username) => {
        setFormData((prev) => {
            if (!prev) return prev
            const list = prev.assignedIntervievatori || []
            const next = list.includes(username) ? list.filter((u) => u !== username) : [...list, username]
            return { ...prev, assignedIntervievatori: next }
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData) return
        onSave({
            ...formData,
            id: Number(formData.id),
            assignedRecruteri: formData.assignedRecruteri || [],
            assignedIntervievatori: formData.assignedIntervievatori || []
        })
        onClose()
    }

    if (!job || !formData) return null

    return (
        <div className="modal-edit-overlay" onClick={onClose} role="presentation">
            <div className="modal-edit-job modal-edit-job--wide" onClick={(e) => e.stopPropagation()}>
                <h2>Editare job</h2>
                <form onSubmit={handleSubmit}>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-id">ID</label>
                        <input
                            id="edit-id"
                            type="number"
                            value={formData.id}
                            onChange={(e) => handleChange('id', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-domeniu">Domeniu</label>
                        <input
                            id="edit-domeniu"
                            type="text"
                            value={formData.domeniu}
                            onChange={(e) => handleChange('domeniu', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-subdomeniu">Subdomeniu</label>
                        <input
                            id="edit-subdomeniu"
                            type="text"
                            value={formData.subdomeniu}
                            onChange={(e) => handleChange('subdomeniu', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-nume">Nume</label>
                        <input
                            id="edit-nume"
                            type="text"
                            value={formData.nume}
                            onChange={(e) => handleChange('nume', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-nivel">Nivel</label>
                        <input
                            id="edit-nivel"
                            type="text"
                            value={formData.nivel}
                            onChange={(e) => handleChange('nivel', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp">
                        <label htmlFor="edit-descriere">Descriere</label>
                        <textarea
                            id="edit-descriere"
                            rows={3}
                            value={formData.descriere}
                            onChange={(e) => handleChange('descriere', e.target.value)}
                        />
                    </div>
                    <div className="modal-edit-camp modal-edit-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                            />
                            Post activ (enabled)
                        </label>
                    </div>
                    {recrutoriDisponibili.length > 0 && (
                        <div className="modal-edit-camp modal-edit-atribuiri">
                            <span className="modal-edit-label">Recruteri atribuiți</span>
                            <div className="modal-edit-checkbox-list">
                                {recrutoriDisponibili.map((u) => (
                                    <label key={u} className="modal-edit-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={(formData.assignedRecruteri || []).includes(u)}
                                            onChange={() => toggleRecrutor(u)}
                                        />
                                        {u}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {intervievatoriDisponibili.length > 0 && (
                        <div className="modal-edit-camp modal-edit-atribuiri">
                            <span className="modal-edit-label">Intervievatori tehnici atribuiți</span>
                            <div className="modal-edit-checkbox-list">
                                {intervievatoriDisponibili.map((u) => (
                                    <label key={u} className="modal-edit-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={(formData.assignedIntervievatori || []).includes(u)}
                                            onChange={() => toggleIntervievator(u)}
                                        />
                                        {u}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="modal-edit-butonuri">
                        <button type="button" className="modal-btn modal-btn-anulare" onClick={onClose}>
                            Anulare
                        </button>
                        <button type="submit" className="modal-btn modal-btn-salvare">
                            Salvează
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
