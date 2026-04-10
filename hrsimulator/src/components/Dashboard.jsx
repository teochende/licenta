import { useState, useMemo, useEffect, useRef } from 'react'
import JobCard from './JobCard'
import { ROLURI } from '../context/login_context'
import { getAplicatiiDashboard, patchAplicatiePipeline } from '../api/aplicatiiApi'
import {
    ETAPE_RECRUTARE,
    STATUS_ETAPA,
    parsePipelineStateJson,
    buildDefaultPipelineState,
} from '../utils/pipelineDefaults'
import './Dashboard.css'

const ORDINE_PRIORITATE = { critic: 0, mare: 1, medie: 2, mica: 3 }

function pipelineLabelFor(etapaKey) {
    switch (etapaKey) {
        case 'depusCv':
            return 'Depus\nCV'
        case 'reviewCv':
            return 'Review CV\n(HR / AI)'
        case 'reviewEngleza':
            return 'Review CV\nengleză'
        case 'reviewTehnic':
            return 'Review CV\ntehnic'
        case 'interviuTehnic':
            return 'Interviu\ntehnic'
        case 'reviewManagement':
            return 'Review CV\nmanagement'
        case 'interviuManagement':
            return 'Interviu\nmanagement'
        case 'oferta':
            return 'Ofertă'
        default:
            return etapaKey
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

const initialStatsForJob = (id) => ({
    pozitiiLibere: Math.max(1, (id % 3) + 1),
    totalCVuri: id % 5,
    cvAcceptate: Math.floor((id % 5) / 2),
    cvRespinse: Math.floor((id % 5) / 3)
})

function filtreazaPosturiDupaRol(posturi, user) {
    if (!user?.rol) return posturi
    if (user.rol === ROLURI.MANAGER_RECRUTARE) return posturi
    if (user.rol === ROLURI.MANAGER_DEPARTAMENT) {
        return posturi.filter((p) => p.domeniu === user.departament)
    }
    if (user.rol === ROLURI.RECRUTOR) {
        return posturi.filter((p) => (p.assignedRecruteri || []).includes(user.nume))
    }
    if (user.rol === ROLURI.INTERVIEVATOR_TEHNIC) {
        return posturi.filter((p) => (p.assignedIntervievatori || []).includes(user.nume))
    }
    return posturi
}

export default function Dashboard({
    posturi = [],
    setPosturi,
    user,
    authToken,
    onRemoteSaveDescriere,
}) {
    const posturiVizibile = useMemo(
        () => filtreazaPosturiDupaRol(posturi, user),
        [posturi, user]
    )
    const [aplicatiiServer, setAplicatiiServer] = useState([])
    const pipelineSaveTimers = useRef({})
    const [jobStats, setJobStats] = useState({})
    const [categoryOrder, setCategoryOrder] = useState({})
    const [jobPriorities, setJobPriorities] = useState({})
    const [aplicantiState, setAplicantiState] = useState({})
    const [candidatDetaliiOpen, setCandidatDetaliiOpen] = useState(null)
    const [hoverEtapa, setHoverEtapa] = useState(null)

    useEffect(() => {
        if (!authToken) {
            setAplicatiiServer([])
            return
        }
        let cancel = false
        getAplicatiiDashboard(authToken)
            .then((rows) => {
                if (!cancel) setAplicatiiServer(Array.isArray(rows) ? rows : [])
            })
            .catch(() => {
                if (!cancel) setAplicatiiServer([])
            })
        return () => {
            cancel = true
        }
    }, [authToken, posturiVizibile])

    const schedulePipelinePersist = (aplicatieId, stateSlice) => {
        if (!authToken || aplicatieId == null) return
        const prev = pipelineSaveTimers.current[aplicatieId]
        if (prev) clearTimeout(prev)
        pipelineSaveTimers.current[aplicatieId] = setTimeout(() => {
            patchAplicatiePipeline(authToken, aplicatieId, JSON.stringify(stateSlice)).catch(() => {})
            delete pipelineSaveTimers.current[aplicatieId]
        }, 550)
    }

    useEffect(() => {
        setJobStats((prev) => {
            const next = { ...prev }
            posturiVizibile.forEach((p) => {
                if (next[p.id] == null) {
                    next[p.id] = initialStatsForJob(p.id)
                }
            })
            return next
        })
    }, [posturiVizibile])

    useEffect(() => {
        setCategoryOrder((prev) => {
            const byDomeniu = {}
            posturiVizibile.forEach((p) => {
                if (!byDomeniu[p.domeniu]) byDomeniu[p.domeniu] = []
                byDomeniu[p.domeniu].push(p.id)
            })
            const next = { ...prev }
            Object.entries(byDomeniu).forEach(([domeniu, ids]) => {
                const existing = next[domeniu] || []
                const existingSet = new Set(existing)
                const newIds = ids.filter((id) => !existingSet.has(id))
                next[domeniu] = [
                    ...existing.filter((id) => ids.includes(id)),
                    ...newIds
                ]
            })
            return next
        })
    }, [posturiVizibile])

    useEffect(() => {
        setJobPriorities((prev) => {
            const next = { ...prev }
            posturiVizibile.forEach((p) => {
                if (next[p.id] == null) {
                    next[p.id] = 'mica'
                }
            })
            return next
        })
    }, [posturiVizibile])

    const setPrioritateJob = (jobId, prioritate) => {
        setJobPriorities((prev) => ({ ...prev, [jobId]: prioritate }))
    }

    const handleReorder = (draggedJobId, dropTargetJobId, domeniu) => {
        if (draggedJobId === dropTargetJobId) return
        const targetPrioritate = jobPriorities[dropTargetJobId] || 'mica'

        setCategoryOrder((prev) => {
            const order = [...(prev[domeniu] || [])]
            const from = order.indexOf(draggedJobId)
            const to = order.indexOf(dropTargetJobId)
            if (from === -1 || to === -1) return prev
            order.splice(from, 1)
            const newTo = order.indexOf(dropTargetJobId)
            order.splice(newTo, 0, draggedJobId)
            return { ...prev, [domeniu]: order }
        })

        setJobPriorities((prev) => ({ ...prev, [draggedJobId]: targetPrioritate }))
    }

    const handleReorderToEnd = (draggedJobId, domeniu) => {
        setCategoryOrder((prev) => {
            const order = [...(prev[domeniu] || [])]
            const from = order.indexOf(draggedJobId)
            if (from === -1) return prev
            order.splice(from, 1)
            order.push(draggedJobId)
            return { ...prev, [domeniu]: order }
        })
        setJobPriorities((prev) => ({ ...prev, [draggedJobId]: 'mica' }))
    }

    const categorii = useMemo(() => {
        const byDomeniu = {}
        posturiVizibile.forEach((p) => {
            if (!byDomeniu[p.domeniu]) byDomeniu[p.domeniu] = []
            byDomeniu[p.domeniu].push(p)
        })
        return Object.entries(categoryOrder).map(([domeniu, orderedIds]) => {
            const jobsMap = Object.fromEntries((byDomeniu[domeniu] || []).map((j) => [j.id, j]))
            const jobs = orderedIds.map((id) => jobsMap[id]).filter(Boolean)
            const indexInOrder = Object.fromEntries(orderedIds.map((id, i) => [id, i]))
            jobs.sort((a, b) => {
                const pa = ORDINE_PRIORITATE[jobPriorities[a.id] || 'mica']
                const pb = ORDINE_PRIORITATE[jobPriorities[b.id] || 'mica']
                if (pa !== pb) return pa - pb
                return (indexInOrder[a.id] ?? 0) - (indexInOrder[b.id] ?? 0)
            })
            return { domeniu, jobs }
        })
    }, [posturiVizibile, categoryOrder, jobPriorities])

    const jobsVizibileMap = useMemo(
        () => Object.fromEntries(posturiVizibile.map((p) => [p.id, p])),
        [posturiVizibile]
    )
    const jobIdsVizibile = useMemo(
        () => new Set(posturiVizibile.map((p) => p.id)),
        [posturiVizibile]
    )

    const aplicantiVizibili = useMemo(() => {
        const aplicari = []
        aplicatiiServer.forEach((a) => {
            const jobId = a.postId
            if (!jobIdsVizibile.has(jobId)) return
            const job = jobsVizibileMap[jobId]
            if (!job) return
            aplicari.push({
                key: `app-${a.id}`,
                aplicatieId: a.id,
                candidat: {
                    id: a.id,
                    email: a.email,
                    cv:
                        a.cvContinut ||
                        '(Text CV necompletat la aplicare – verificați fișierul atașat în sistem.)',
                },
                jobId,
                job,
                aplicatieRaw: a,
            })
        })
        aplicari.sort((a, b) => {
            const an = numeDinEmail(a.candidat.email)
            const bn = numeDinEmail(b.candidat.email)
            if (an !== bn) return an.localeCompare(bn)
            return String(a.job?.nume || '').localeCompare(String(b.job?.nume || ''))
        })
        return aplicari
    }, [aplicatiiServer, jobIdsVizibile, jobsVizibileMap])

    useEffect(() => {
        setAplicantiState((prev) => {
            const next = { ...prev }
            aplicantiVizibili.forEach(({ key, aplicatieRaw, aplicatieId }) => {
                if (next[key] != null) return
                const fromServer = parsePipelineStateJson(aplicatieRaw?.pipelineStateJson)
                next[key] = fromServer || buildDefaultPipelineState(aplicatieId)
            })
            return next
        })
    }, [aplicantiVizibili])

    const getEtapaTooltip = (aplicantKey, etapaKey) => {
        const st = aplicantiState[aplicantKey]
        const etapaStatus = st?.status?.[etapaKey] ?? STATUS_ETAPA.NEUTRU
        const details = st?.details?.[etapaKey] || {}

        if (etapaKey === 'depusCv') {
            return {
                title: 'Depus CV',
                lines: [
                    `Data depunere: ${details.submittedAt || '—'}`,
                    `Sursă: ${details.source || '—'}`
                ]
            }
        }
        if (etapaKey === 'reviewCv' || etapaKey === 'reviewEngleza' || etapaKey === 'reviewTehnic' || etapaKey === 'reviewManagement') {
            const isAcceptat = etapaStatus === STATUS_ETAPA.ACCEPTAT
            const isRespins = etapaStatus === STATUS_ETAPA.RESPINS
            const reasons = isAcceptat ? details.acceptReasons : isRespins ? details.rejectReasons : null
            const label =
                etapaKey === 'reviewCv'
                    ? (st?.reviewAi ? 'Review CV AI' : 'Review CV HR')
                    : etapaKey === 'reviewEngleza'
                        ? (st?.reviewEnglezaAutomat ? 'Review CV engleză (automat)' : 'Review CV engleză (manual)')
                        : etapaKey === 'reviewTehnic'
                            ? 'Review CV tehnic'
                            : 'Review CV management'

            return {
                title: label,
                lines: [
                    `Status: ${etapaStatus.replaceAll('_', ' ')}`,
                    details.notes ? `Notițe: ${details.notes}` : null,
                    reasons ? `Motive ${isAcceptat ? 'acceptare' : 'respingere'}:` : null,
                    ...(Array.isArray(reasons) ? reasons.map((r) => `- ${r}`) : [])
                ].filter(Boolean)
            }
        }
        if (etapaKey === 'interviuTehnic' || etapaKey === 'interviuManagement') {
            const label = etapaKey === 'interviuTehnic' ? 'Interviu tehnic' : 'Interviu management'
            return {
                title: label,
                lines: [
                    `Status: ${etapaStatus.replaceAll('_', ' ')}`,
                    `Programare: ${details.scheduledAt || '—'}`,
                    details.interviewerNotes ? `Notițe: ${details.interviewerNotes}` : null
                ].filter(Boolean)
            }
        }
        if (etapaKey === 'oferta') {
            return {
                title: 'Ofertă',
                lines: [
                    `Status: ${etapaStatus.replaceAll('_', ' ')}`,
                    details.offerStatus ? `Ofertă: ${details.offerStatus}` : null,
                    details.notes ? `Notițe: ${details.notes}` : null
                ].filter(Boolean)
            }
        }
        return { title: etapaKey, lines: [] }
    }

    const onHoverEticheta = (aplicantKey, etapaKey, element) => {
        if (!element) return
        const rect = element.getBoundingClientRect()
        setHoverEtapa({
            aplicantKey,
            etapaKey,
            // centrăm tooltip-ul pe etichetă și îl afișăm deasupra
            anchorX: rect.left + rect.width / 2,
            anchorY: rect.top
        })
    }

    const clearHoverEticheta = () => setHoverEtapa(null)

    const aplicatieIdFromKey = (aplicantKey) => {
        const m = String(aplicantKey).match(/^app-(\d+)$/)
        return m ? Number(m[1]) : null
    }

    const toggleAplicant = (aplicantKey, field) => {
        setAplicantiState((prev) => {
            const cur = prev[aplicantKey]
            if (!cur) return prev
            const updated = { ...cur, [field]: !cur[field] }
            const aid = aplicatieIdFromKey(aplicantKey)
            schedulePipelinePersist(aid, updated)
            return { ...prev, [aplicantKey]: updated }
        })
    }

    const cycleStatus = (aplicantKey, etapaKey) => {
        const order = [STATUS_ETAPA.IN_ASTEPTARE, STATUS_ETAPA.ACCEPTAT, STATUS_ETAPA.RESPINS]
        setAplicantiState((prev) => {
            const currentState = prev[aplicantKey]
            if (!currentState) return prev

            const etapaIndex = ETAPE_RECRUTARE.findIndex((e) => e.key === etapaKey)
            const unlockedUpTo = Number.isFinite(currentState.unlockedUpTo) ? currentState.unlockedUpTo : 0
            if (etapaIndex === -1 || etapaIndex > unlockedUpTo) {
                return prev
            }

            const current = currentState?.status?.[etapaKey] ?? STATUS_ETAPA.IN_ASTEPTARE
            const idx = order.indexOf(current)
            const nextStatus = order[(idx + 1) % order.length]

            const next = {
                ...prev,
                [aplicantKey]: {
                    ...currentState,
                    status: {
                        ...(currentState?.status || {}),
                        [etapaKey]: nextStatus
                    }
                }
            }

            if (nextStatus === STATUS_ETAPA.ACCEPTAT) {
                const nextIndex = etapaIndex + 1
                if (nextIndex < ETAPE_RECRUTARE.length) {
                    const nextKey = ETAPE_RECRUTARE[nextIndex].key
                    const nextUnlocked = Math.max(unlockedUpTo, nextIndex)
                    const prevNextStatus = next[aplicantKey]?.status?.[nextKey]
                    next[aplicantKey] = {
                        ...next[aplicantKey],
                        unlockedUpTo: nextUnlocked,
                        status: {
                            ...next[aplicantKey].status,
                            [nextKey]: prevNextStatus === STATUS_ETAPA.NEUTRU ? STATUS_ETAPA.IN_ASTEPTARE : prevNextStatus
                        }
                    }
                }
            } else if (nextStatus === STATUS_ETAPA.RESPINS) {
                const lockedStatus = { ...(next[aplicantKey]?.status || {}) }
                for (let i = etapaIndex + 1; i < ETAPE_RECRUTARE.length; i += 1) {
                    lockedStatus[ETAPE_RECRUTARE[i].key] = STATUS_ETAPA.NEUTRU
                }
                next[aplicantKey] = {
                    ...next[aplicantKey],
                    unlockedUpTo: etapaIndex,
                    status: lockedStatus
                }
            }

            const aid = aplicatieIdFromKey(aplicantKey)
            schedulePipelinePersist(aid, next[aplicantKey])

            return next
        })
    }

    return (
        <div className="dashboard">
            <h1>Dashboard – Procesarea posturilor</h1>
            {categorii.length === 0 ? (
                <p className="dashboard-gol">
                    {user?.rol === ROLURI.RECRUTOR || user?.rol === ROLURI.INTERVIEVATOR_TEHNIC
                        ? 'Nu aveți posturi atribuite.'
                        : 'Nu există posturi vizibile pentru contul dvs.'}
                </p>
            ) : (
                categorii.map(({ domeniu, jobs }) => (
                    <section key={domeniu} className="dashboard-categorie">
                        <h2 className="dashboard-categorie-titlu">{domeniu}</h2>
                        <div className="dashboard-categorie-cards">
                            {jobs.map((job, index) => {
                                const candidatiPentruJob = aplicatiiServer
                                    .filter((a) => a.postId === job.id)
                                    .map((a) => ({
                                        id: a.id,
                                        email: a.email,
                                        cv:
                                            a.cvContinut ||
                                            '(Text CV necompletat la aplicare.)',
                                        jobIds: [job.id],
                                    }))
                                const nrCandidatiAplicati = candidatiPentruJob.length
                                const statsCuCandidati = {
                                    ...jobStats[job.id],
                                    totalCVuri: nrCandidatiAplicati
                                }
                                const poateEditaDescriere = (user?.rol === ROLURI.RECRUTOR || user?.rol === ROLURI.INTERVIEVATOR_TEHNIC) && setPosturi
                                return (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    stats={statsCuCandidati}
                                    prioritate={jobPriorities[job.id] || 'mica'}
                                    onPrioritateChange={(p) => setPrioritateJob(job.id, p)}
                                    onReorder={(draggedId, dropTargetId) => handleReorder(draggedId, dropTargetId, domeniu)}
                                    onReorderToEnd={(draggedId) => handleReorderToEnd(draggedId, domeniu)}
                                    isLast={index === jobs.length - 1}
                                    poateEditaDescriere={poateEditaDescriere}
                                    onSaveDescriere={
                                        onRemoteSaveDescriere ||
                                        (setPosturi
                                            ? (jobId, descriere) =>
                                                  setPosturi((prev) =>
                                                      prev.map((p) => (p.id === jobId ? { ...p, descriere } : p))
                                                  )
                                            : undefined)
                                    }
                                    candidatiAplicanti={candidatiPentruJob}
                                />
                                )
                            })}
                            <div
                                className="dashboard-drop-ultima-pozitie"
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = 'move'
                                    e.currentTarget.classList.add('dashboard-drop-ultima-pozitie--active')
                                }}
                                onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        e.currentTarget.classList.remove('dashboard-drop-ultima-pozitie--active')
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.classList.remove('dashboard-drop-ultima-pozitie--active')
                                    try {
                                        const { jobId, domeniu: dragDomeniu } = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
                                        if (jobId && dragDomeniu === domeniu) {
                                            handleReorderToEnd(jobId, domeniu)
                                        }
                                    } catch (_) {}
                                }}
                            >
                                Eliberează aici pentru ultima poziție
                            </div>
                        </div>
                    </section>
                ))
            )}

            <section className="dashboard-aplicanti">
                <div className="dashboard-aplicanti-header">
                    <h2 className="dashboard-aplicanti-titlu">Candidați pentru joburile vizibile</h2>
                    <span className="dashboard-aplicanti-count">{aplicantiVizibili.length} aplicări</span>
                </div>

                {aplicantiVizibili.length === 0 ? (
                    <p className="dashboard-aplicanti-gol">Nu există candidați care au aplicat la joburile vizibile pentru rolul tău.</p>
                ) : (
                    <div className="dashboard-aplicanti-lista">
                        {aplicantiVizibili.map(({ key, candidat, job }) => {
                            const state = aplicantiState[key]
                            const reviewAi = state?.reviewAi ?? true
                            const reviewEnglezaAutomat = state?.reviewEnglezaAutomat ?? true
                            const statusEtape = state?.status || {}
                            const unlockedUpTo = Number.isFinite(state?.unlockedUpTo) ? state.unlockedUpTo : 0
                            return (
                                <div key={key} className="aplicant-card">
                                    <div className="aplicant-top">
                                        <div className="aplicant-identitate">
                                            <div className="aplicant-nume">{numeDinEmail(candidat.email)}</div>
                                            <div className="aplicant-meta">
                                                <span className="aplicant-email">{candidat.email}</span>
                                                <span className="aplicant-job">Job: <strong>{job?.nume}</strong></span>
                                            </div>
                                        </div>
                                        <div className="aplicant-actiuni">
                                            <button
                                                type="button"
                                                className="aplicant-btn-detalii"
                                                onClick={() => setCandidatDetaliiOpen({ key, candidat, job })}
                                            >
                                                Vezi detalii
                                            </button>
                                        </div>
                                    </div>

                                    <div className="aplicant-toggle-row">
                                        <label className="aplicant-toggle">
                                            <input
                                                type="checkbox"
                                                checked={reviewAi}
                                                onChange={() => toggleAplicant(key, 'reviewAi')}
                                            />
                                            Review CV AI
                                        </label>
                                        <label className="aplicant-toggle">
                                            <input
                                                type="checkbox"
                                                checked={reviewEnglezaAutomat}
                                                onChange={() => toggleAplicant(key, 'reviewEnglezaAutomat')}
                                            />
                                            Review engleză automat
                                        </label>
                                    </div>

                                    <div className="aplicant-pipeline">
                                        <div className="pipeline-track" role="list" aria-label="Pipeline recrutare">
                                            {ETAPE_RECRUTARE.map((et, idx) => {
                                                const isLocked = idx > unlockedUpTo
                                                const rawStatus = statusEtape[et.key] ?? STATUS_ETAPA.NEUTRU
                                                const status = isLocked ? STATUS_ETAPA.NEUTRU : rawStatus
                                                const isCurrent = idx === unlockedUpTo && status === STATUS_ETAPA.IN_ASTEPTARE
                                                return (
                                                    <div key={et.key} className="pipeline-item" role="listitem">
                                                        <div
                                                            className="pipeline-label-wrap"
                                                            onMouseEnter={(e) => onHoverEticheta(key, et.key, e.currentTarget)}
                                                            onMouseMove={(e) => onHoverEticheta(key, et.key, e.currentTarget)}
                                                            onMouseLeave={clearHoverEticheta}
                                                        >
                                                            <div className={`pipeline-label pipeline-label--${status}`}>
                                                                {pipelineLabelFor(et.key)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={`pipeline-dot pipeline-dot--${status}${isCurrent ? ' pipeline-dot--current' : ''}`}
                                                            onClick={() => cycleStatus(key, et.key)}
                                                            disabled={isLocked}
                                                            aria-label={`${et.label} (${status.replaceAll('_', ' ')})`}
                                                            title={isLocked ? `${et.label} (blocat)` : `${et.label} (${status.replaceAll('_', ' ')})`}
                                                        />
                                                        {idx < ETAPE_RECRUTARE.length - 1 ? (
                                                            <div className={`pipeline-line pipeline-line--${status}`} aria-hidden="true" />
                                                        ) : (
                                                            <div className="pipeline-line pipeline-line--none" aria-hidden="true" />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="aplicant-hint">
                                        Poți da click pe o etapă din pipeline pentru a schimba statusul (în așteptare → acceptat → respins).
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {hoverEtapa?.aplicantKey && hoverEtapa?.etapaKey && (
                (() => {
                    const tip = getEtapaTooltip(hoverEtapa.aplicantKey, hoverEtapa.etapaKey)
                    return (
                        <div
                            className="pipeline-tooltip pipeline-tooltip--fixed"
                            role="tooltip"
                            style={{
                                left: `${hoverEtapa.anchorX}px`,
                                top: `${hoverEtapa.anchorY}px`
                            }}
                        >
                            <div className="pipeline-tooltip-title">{tip.title}</div>
                            <div className="pipeline-tooltip-body">
                                {tip.lines.map((ln, i) => (
                                    <div key={i} className="pipeline-tooltip-line">{ln}</div>
                                ))}
                            </div>
                        </div>
                    )
                })()
            )}

            {candidatDetaliiOpen && (
                <div className="aplicant-modal-overlay" onClick={() => setCandidatDetaliiOpen(null)}>
                    <div className="aplicant-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="aplicant-modal-header">
                            <h3>Detalii candidat</h3>
                            <button type="button" className="aplicant-modal-close" onClick={() => setCandidatDetaliiOpen(null)}>
                                Închide
                            </button>
                        </div>
                        <div className="aplicant-modal-body">
                            <div className="aplicant-modal-row">
                                <span className="aplicant-modal-label">Nume</span>
                                <span className="aplicant-modal-value">{numeDinEmail(candidatDetaliiOpen.candidat.email)}</span>
                            </div>
                            <div className="aplicant-modal-row">
                                <span className="aplicant-modal-label">Email</span>
                                <span className="aplicant-modal-value">{candidatDetaliiOpen.candidat.email}</span>
                            </div>
                            <div className="aplicant-modal-row">
                                <span className="aplicant-modal-label">Job</span>
                                <span className="aplicant-modal-value">{candidatDetaliiOpen.job?.nume}</span>
                            </div>

                            <div className="aplicant-cv">
                                <h4>CV</h4>
                                <div className="aplicant-cv-box">
                                    {candidatDetaliiOpen.candidat.cv}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
