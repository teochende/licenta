import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import CVReview from './CVReview'
import CvFisierLink from './CvFisierLink'
import VideoFisierLink from './VideoFisierLink'
import { formatDataAplicare } from '../utils/dateFormat'
import { JobDescriereSectiuniHint } from '../utils/jobDescriereSections.jsx'
import './JobCard.css'

const OPTIUNI_PRIORITATE = [
    { value: 'critic', label: 'Critică', hint: 'Urgență maximă' },
    { value: 'mare', label: 'Mare', hint: 'Ridicată' },
    { value: 'medie', label: 'Medie', hint: 'Moderată' },
    { value: 'mica', label: 'Mică', hint: 'Standard' }
]

function IconPrioritateChevronDown({ className }) {
    return (
        <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
        </svg>
    )
}

function IconPrioritateNivel({ nivel }) {
    const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
    switch (nivel) {
        case 'critic':
            return (
                <svg {...common}>
                    <path d="M12 2L2 20h20L12 2z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            )
        case 'mare':
            return (
                <svg {...common}>
                    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
            )
        case 'medie':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        case 'mica':
        default:
            return (
                <svg {...common}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            )
    }
}

function numeDinEmail(email) {
    if (!email || !email.includes('@')) return email || '—'
    const prefix = email.split('@')[0]
    return prefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(' ')
}

export default function JobCard({
    job,
    stats = {},
    prioritate = 'mica',
    onPrioritateChange,
    onReorder,
    onReorderToEnd,
    isLast,
    poateEditaDescriere,
    onSaveDescriere,
    candidatiAplicanti = [],
    authToken,
    onScrollToAplicantPipeline,
    onCardClick,
}) {
    const {
        pozitiiLibere = 0,
        totalCVuri = 0,
        cvAcceptate = 0,
        cvRespinse = 0
    } = stats

    const [listaCandidatiOpen, setListaCandidatiOpen] = useState(false)
    const [prioritateMenuOpen, setPrioritateMenuOpen] = useState(false)
    const [prioMenuStyle, setPrioMenuStyle] = useState(null)
    const prioritateWrapRef = useRef(null)
    const prioritateTriggerRef = useRef(null)
    const prioritateMenuPortalRef = useRef(null)

    const updatePrioMenuPosition = useCallback(() => {
        const el = prioritateTriggerRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const margin = 8
        const gap = 6
        const minW = 220
        const width = Math.min(Math.max(minW, r.width), vw - 2 * margin)
        let left = r.right - width
        left = Math.max(margin, Math.min(left, vw - width - margin))

        const belowTop = r.bottom + gap
        const spaceBelow = vh - belowTop - margin
        const spaceAbove = r.top - gap - margin
        const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove
        const maxH = (h) => Math.min(360, Math.max(120, h))

        if (preferBelow) {
            setPrioMenuStyle({
                position: 'fixed',
                top: belowTop,
                bottom: 'auto',
                left,
                width,
                maxHeight: maxH(spaceBelow),
                zIndex: 250000,
            })
        } else {
            setPrioMenuStyle({
                position: 'fixed',
                top: 'auto',
                bottom: vh - r.top + gap,
                left,
                width,
                maxHeight: maxH(spaceAbove),
                zIndex: 250000,
            })
        }
    }, [])

    useLayoutEffect(() => {
        if (!prioritateMenuOpen) {
            setPrioMenuStyle(null)
            return
        }
        updatePrioMenuPosition()
        const onScroll = () => updatePrioMenuPosition()
        const onResize = () => updatePrioMenuPosition()
        window.addEventListener('resize', onResize)
        document.addEventListener('scroll', onScroll, true)
        return () => {
            window.removeEventListener('resize', onResize)
            document.removeEventListener('scroll', onScroll, true)
        }
    }, [prioritateMenuOpen, updatePrioMenuPosition])

    useEffect(() => {
        if (!prioritateMenuOpen) return
        const onDocMouseDown = (ev) => {
            const t = ev.target
            if (prioritateWrapRef.current?.contains(t) || prioritateMenuPortalRef.current?.contains(t)) return
            setPrioritateMenuOpen(false)
        }
        const onKey = (ev) => {
            if (ev.key === 'Escape') setPrioritateMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocMouseDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [prioritateMenuOpen])

    const handleDragStart = (e) => {
        if (e.target.closest('.job-card-prioritate') || e.target.closest('.job-card-candidati-click')) return
        e.dataTransfer.setData('application/json', JSON.stringify({ jobId: job.id, domeniu: job.domeniu }))
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.classList.add('job-card--dragging')
    }

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('job-card--dragging')
    }

    const handleDragOver = (e) => {
        if (e.target.closest('.job-card-prioritate') || e.target.closest('.job-card-candidati-click')) return
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
        if (e.target.closest('.job-card-prioritate')) return
        try {
            const { jobId: draggedJobId } = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
            if (!draggedJobId || draggedJobId === job.id) return
            if (isLast && onReorderToEnd) {
                onReorderToEnd(draggedJobId)
            } else if (onReorder) {
                onReorder(draggedJobId, job.id)
            }
        } catch (e) {
            // ignore invalid drag payload
            console.debug('JobCard drop payload invalid', e)
        }
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
            onClick={(e) => {
                // nu declanșăm selectarea cardului când se apasă pe controale interactive
                if (e.target.closest('.job-card-prioritate') || e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('textarea')) {
                    return
                }
                if (e.target.closest('.job-card-modal-overlay') || e.target.closest('.job-card-modal-descriere') || e.target.closest('.job-card-modal-lista-candidati')) {
                    return
                }
                onCardClick?.(job)
            }}
        >
            <div className="job-card-titlu-row">
                <h3 className="job-card-titlu">{job.nume}</h3>
                <div
                    className={`job-card-prioritate${prioritateMenuOpen ? ' job-card-prioritate--open' : ''}`}
                    ref={prioritateWrapRef}
                >
                    <button
                        type="button"
                        ref={prioritateTriggerRef}
                        className={`job-card-prioritate-trigger job-card-prioritate-trigger--${prioritate}`}
                        id={`job-card-prio-trigger-${job.id}`}
                        aria-label="Prioritate"
                        aria-haspopup="listbox"
                        aria-expanded={prioritateMenuOpen}
                        onClick={() => setPrioritateMenuOpen((o) => !o)}
                    >
                        <span className="job-card-prioritate-trigger__icon" aria-hidden>
                            <IconPrioritateNivel nivel={prioritate} />
                        </span>
                        <span className="job-card-prioritate-trigger__label">
                            {OPTIUNI_PRIORITATE.find((o) => o.value === prioritate)?.label ?? prioritate}
                        </span>
                        <IconPrioritateChevronDown className={`job-card-prioritate-trigger__chev${prioritateMenuOpen ? ' job-card-prioritate-trigger__chev--up' : ''}`} />
                    </button>
                </div>
            </div>
            {prioritateMenuOpen && prioMenuStyle
                ? createPortal(
                      <ul
                          ref={prioritateMenuPortalRef}
                          className="job-card-prioritate-menu job-card-prioritate-menu--portal"
                          role="listbox"
                          aria-labelledby={`job-card-prio-trigger-${job.id}`}
                          style={prioMenuStyle}
                      >
                          {OPTIUNI_PRIORITATE.map((opt) => (
                              <li key={opt.value} className="job-card-prioritate-menu__item" role="none">
                                  <button
                                      type="button"
                                      role="option"
                                      aria-selected={opt.value === prioritate}
                                      className={`job-card-prioritate-option job-card-prioritate-option--${opt.value}${opt.value === prioritate ? ' job-card-prioritate-option--current' : ''}`}
                                      onClick={() => {
                                          onPrioritateChange?.(opt.value)
                                          setPrioritateMenuOpen(false)
                                      }}
                                  >
                                      <span className="job-card-prioritate-option__icon" aria-hidden>
                                          <IconPrioritateNivel nivel={opt.value} />
                                      </span>
                                      <span className="job-card-prioritate-option__label-wrap">
                                          <span className="job-card-prioritate-option__label">{opt.label}</span>
                                          <span className="job-card-prioritate-option__hint">{opt.hint}</span>
                                      </span>
                                      {opt.value === prioritate ? (
                                          <span className="job-card-prioritate-option__check" aria-hidden>✓</span>
                                      ) : null}
                                  </button>
                              </li>
                          ))}
                      </ul>,
                      document.body
                  )
                : null}
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
            {editDescriereOpen
                ? createPortal(
                      <div className="job-card-modal-overlay job-card-modal-overlay--portal" onClick={() => setEditDescriereOpen(false)}>
                          <div className="job-card-modal-descriere" onClick={(e) => e.stopPropagation()}>
                              <h4>Editează descrierea jobului</h4>
                              <JobDescriereSectiuniHint className="job-card-modal-hint-descriere" compact />
                              <textarea
                                  rows={4}
                                  value={draftDescriere}
                                  onChange={(e) => setDraftDescriere(e.target.value)}
                                  className="job-card-modal-textarea"
                              />
                              <div className="job-card-modal-btns">
                                  <button type="button" className="job-card-btn-anulare" onClick={() => setEditDescriereOpen(false)}>
                                      Anulare
                                  </button>
                                  <button type="button" className="job-card-btn-salvare" onClick={handleSaveDescriere}>
                                      Salvează
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
            {listaCandidatiOpen
                ? createPortal(
                      <div
                          className="job-card-modal-overlay job-card-modal-overlay--portal"
                          role="presentation"
                          onClick={() => setListaCandidatiOpen(false)}
                      >
                          <div
                              className="job-card-modal-lista-candidati job-card-modal-lista-candidati--portal"
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby={`job-card-lista-candidati-title-${job.id}`}
                              onClick={(e) => e.stopPropagation()}
                          >
                              <h4 id={`job-card-lista-candidati-title-${job.id}`}>Candidați care au aplicat – {job.nume}</h4>
                              <div className="job-card-modal-lista-candidati__scroll">
                                  {candidatiAplicanti.length === 0 ? (
                                      <p className="job-card-lista-gol">Niciun candidat pentru acest post.</p>
                                  ) : (
                                      <ul className="job-card-candidati-lista">
                                          {candidatiAplicanti.map((c) => (
                                              <li
                                                  key={c.id}
                                                  className="job-card-candidat-item job-card-candidat-item--clickabil"
                                                  onClick={() => onScrollToAplicantPipeline?.(c.id)}
                                              >
                                                  <div className="job-card-candidat-linie-principala">
                                                      <span className="job-card-candidat-nume">{numeDinEmail(c.email)}</span>
                                                      {c.cvNumeFisier ? (
                                                          c.cvFisierStocat ? (
                                                              <span className="job-card-cv-link-inline">
                                                                  <CvFisierLink
                                                                      authToken={authToken}
                                                                      aplicatieId={c.id}
                                                                      cvNumeFisier={c.cvNumeFisier}
                                                                      cvFisierStocat={c.cvFisierStocat}
                                                                  />
                                                              </span>
                                                          ) : (
                                                              <span className="job-card-cv-nume-fisier" title="Fișier indisponibil pentru descărcare">
                                                                  {c.cvNumeFisier}
                                                              </span>
                                                          )
                                                      ) : null}
                                                      {c.videoNumeFisier && c.videoFisierStocat ? (
                                                          <span className="job-card-cv-link-inline job-card-video-link-inline">
                                                              <VideoFisierLink
                                                                  authToken={authToken}
                                                                  aplicatieId={c.id}
                                                                  videoNumeFisier={c.videoNumeFisier}
                                                                  videoFisierStocat={c.videoFisierStocat}
                                                              />
                                                          </span>
                                                      ) : c.videoNumeFisier && !c.videoFisierStocat ? (
                                                          <span className="job-card-cv-nume-fisier" title="Videoclip indisponibil">
                                                              {c.videoNumeFisier}
                                                          </span>
                                                      ) : null}
                                                  </div>
                                                  <span className="job-card-candidat-email">{c.email}</span>
                                                  <span className="job-card-candidat-data">
                                                      Aplicat: {formatDataAplicare(c.dataAplicare)}
                                                  </span>
                                              </li>
                                          ))}
                                      </ul>
                                  )}
                              </div>
                              <div className="job-card-modal-btns">
                                  <button type="button" className="job-card-btn-anulare" onClick={() => setListaCandidatiOpen(false)}>
                                      Închide
                                  </button>
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </div>
    )
}
