import { useState } from 'react'
import CVReview from './CVReview'
import CvFisierLink from './CvFisierLink'
import { formatDataAplicare } from '../utils/dateFormat'
import './JobCard.css'

const OPTIUNI_PRIORITATE = [
    { value: 'critic', label: 'Critică' },
    { value: 'mare', label: 'Mare' },
    { value: 'medie', label: 'Medie' },
    { value: 'mica', label: 'Mică' }
]

function numeDinEmail(email) {
    if (!email || !email.includes('@')) return email || '—'
    const prefix = email.split('@')[0]
    return prefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(' ')
}

export default function JobCard({ job, stats = {}, prioritate = 'mica', onPrioritateChange, onReorder, onReorderToEnd, isLast, poateEditaDescriere, onSaveDescriere, candidatiAplicanti = [], authToken }) {
    const {
        pozitiiLibere = 0,
        totalCVuri = 0,
        cvAcceptate = 0,
        cvRespinse = 0
    } = stats

    const [listaCandidatiOpen, setListaCandidatiOpen] = useState(false)
    const [candidatSelectat, setCandidatSelectat] = useState(null)

    const handleDragStart = (e) => {
        if (e.target.closest('select') || e.target.closest('.job-card-candidati-click')) return
        e.dataTransfer.setData('application/json', JSON.stringify({ jobId: job.id, domeniu: job.domeniu }))
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.classList.add('job-card--dragging')
    }

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('job-card--dragging')
    }

    const handleDragOver = (e) => {
        if (e.target.closest('select') || e.target.closest('.job-card-candidati-click')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        e.currentTarget.classList.add('job-card--drag-over')
    }

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('job-card--drag-over')
        }
    }

    const [editDescriereOpen, setEditDescriereOpen] = useState(false)
    const [draftDescriere, setDraftDescriere] = useState(job.descriere || '')

    const handleSaveDescriere = () => {
        onSaveDescriere?.(job.id, draftDescriere)
        setEditDescriereOpen(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.currentTarget.classList.remove('job-card--drag-over')
        if (e.target.closest('select')) return
        try {
            const { jobId: draggedJobId } = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
            if (!draggedJobId || draggedJobId === job.id) return
            if (isLast && onReorderToEnd) {
                onReorderToEnd(draggedJobId)
            } else if (onReorder) {
                onReorder(draggedJobId, job.id)
            }
        } catch (_) {}
    }

    return (
        <div
            className={`job-card job-card--${prioritate}`}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="job-card-titlu-row">
                <h3 className="job-card-titlu">{job.nume}</h3>
                <select
                    className={`job-card-select-prioritate job-card-select-prioritate--${prioritate}`}
                    value={prioritate}
                    onChange={(e) => onPrioritateChange?.(e.target.value)}
                    aria-label="Prioritate"
                >
                    {OPTIUNI_PRIORITATE.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <p className="job-card-meta">{job.domeniu} | {job.subdomeniu} | {job.nivel}</p>
            {poateEditaDescriere && (
                <div className="job-card-edit-descriere">
                    <button type="button" className="job-card-btn-descriere" onClick={() => { setDraftDescriere(job.descriere || ''); setEditDescriereOpen(true) }}>
                        Editează descrierea
                    </button>
                </div>
            )}
            <div className="job-card-indicatori">
                <span className="job-card-indicator">
                    <span className="job-card-indicator-label">Pozitii libere:</span>
                    <strong>{pozitiiLibere}</strong>
                </span>
                <span className="job-card-indicator">
                    <span className="job-card-indicator-label">Candidați au aplicat:</span>
                    <strong
                        role="button"
                        tabIndex={0}
                        className={totalCVuri > 0 ? 'job-card-candidati-click' : ''}
                        onClick={() => totalCVuri > 0 && setListaCandidatiOpen(true)}
                        onKeyDown={(e) => totalCVuri > 0 && (e.key === 'Enter' || e.key === ' ') && setListaCandidatiOpen(true)}
                    >
                        {totalCVuri}
                    </strong>
                </span>
            </div>
            <CVReview
                totalCVuri={totalCVuri}
                cvAcceptate={cvAcceptate}
                cvRespinse={cvRespinse}
            />
            {editDescriereOpen && (
                <div className="job-card-modal-overlay" onClick={() => setEditDescriereOpen(false)}>
                    <div className="job-card-modal-descriere" onClick={(e) => e.stopPropagation()}>
                        <h4>Editează descrierea jobului</h4>
                        <textarea
                            rows={4}
                            value={draftDescriere}
                            onChange={(e) => setDraftDescriere(e.target.value)}
                            className="job-card-modal-textarea"
                        />
                        <div className="job-card-modal-btns">
                            <button type="button" className="job-card-btn-anulare" onClick={() => setEditDescriereOpen(false)}>Anulare</button>
                            <button type="button" className="job-card-btn-salvare" onClick={handleSaveDescriere}>Salvează</button>
                        </div>
                    </div>
                </div>
            )}
            {listaCandidatiOpen && (
                <div className="job-card-modal-overlay" onClick={() => setListaCandidatiOpen(false)}>
                    <div className="job-card-modal-lista-candidati" onClick={(e) => e.stopPropagation()}>
                        <h4>Candidați care au aplicat – {job.nume}</h4>
                        {candidatiAplicanti.length === 0 ? (
                            <p className="job-card-lista-gol">Niciun candidat pentru acest post.</p>
                        ) : (
                            <>
                                <ul className="job-card-candidati-lista">
                                    {candidatiAplicanti.map((c) => (
                                        <li
                                            key={c.id}
                                            className="job-card-candidat-item job-card-candidat-item--clickabil"
                                            onClick={() => setCandidatSelectat(c)}
                                        >
                                            <span className="job-card-candidat-nume">{numeDinEmail(c.email)}</span>
                                            <span className="job-card-candidat-email">{c.email}</span>
                                            <span className="job-card-candidat-data">
                                                Aplicat: {formatDataAplicare(c.dataAplicare)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {candidatSelectat && (
                                    <div className="job-card-cv-container">
                                        <h5 className="job-card-cv-titlu">
                                            CV – {numeDinEmail(candidatSelectat.email)}
                                        </h5>
                                        <p className="job-card-cv-email">{candidatSelectat.email}</p>
                                        <p className="job-card-cv-data">
                                            Data aplicării: {formatDataAplicare(candidatSelectat.dataAplicare)}
                                        </p>
                                        <CvFisierLink
                                            authToken={authToken}
                                            aplicatieId={candidatSelectat.id}
                                            cvNumeFisier={candidatSelectat.cvNumeFisier}
                                            cvFisierStocat={candidatSelectat.cvFisierStocat}
                                        />
                                        {candidatSelectat.cv?.trim() ? (
                                            <div className="job-card-cv-text">
                                                {candidatSelectat.cv}
                                            </div>
                                        ) : null}
                                        <div className="job-card-cv-actiuni">
                                            <button
                                                type="button"
                                                className="job-card-btn-anulare"
                                                onClick={() => setCandidatSelectat(null)}
                                            >
                                                Închide CV-ul
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="job-card-modal-btns">
                            <button type="button" className="job-card-btn-anulare" onClick={() => setListaCandidatiOpen(false)}>Închide</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
