import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import JobCard from './JobCard'
import CvFisierLink from './CvFisierLink'
import { ROLURI } from '../context/login_context'
import {
    getAplicatiiDashboard,
    patchAplicatiePipeline,
    patchAplicatieVizibilitateIntervievatoriTehnic,
    recalcAplicatiiMatchScore,
    recalcAplicatieMatchScore,
} from '../api/aplicatiiApi'
import { patchPost, putOrdineDashboard } from '../api/postsApi'
import {
    ETAPE_RECRUTARE,
    STATUS_ETAPA,
    parsePipelineStateJson,
    buildDefaultPipelineState,
} from '../utils/pipelineDefaults'
import { formatDataAplicare } from '../utils/dateFormat'
import './Dashboard.css'

const ORDINE_PRIORITATE = { critic: 0, mare: 1, medie: 2, mica: 3 }

function sortJobsDashboard(jobs) {
    return [...jobs].sort((a, b) => {
        const pa = ORDINE_PRIORITATE[a.prioritate || 'mica']
        const pb = ORDINE_PRIORITATE[b.prioritate || 'mica']
        if (pa !== pb) return pa - pb
        return (a.ordineDashboard ?? 0) - (b.ordineDashboard ?? 0)
    })
}

function pipelineLabelFor(etapaKey) {
    switch (etapaKey) {
        case 'depusCv':
            return 'Depus\nCV'
        case 'reviewCv':
            return 'Review CV\n(HR / AI)'
        case 'reviewEngleza':
            return 'Review CV\nengleză'
        case 'interviuHr':
            return 'Interviu\nHR'
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

/** Candidat respins dacă orice etapă din pipeline are status „respins”. */
function pipelineAreCandidatRespins(state) {
    if (!state?.status || typeof state.status !== 'object') return false
    return Object.values(state.status).some((s) => s === STATUS_ETAPA.RESPINS)
}

function compareAplicantiEntries(a, b) {
    const an = numeDinEmail(a.candidat.email)
    const bn = numeDinEmail(b.candidat.email)
    if (an !== bn) return an.localeCompare(bn)
    return String(a.job?.nume || '').localeCompare(String(b.job?.nume || ''))
}

/** Previzualizare text CV: fără placeholder vechi când există fișier; ascunde mesajul „[CV încărcat: …]”. */
function cvContinutPentruAfisare(a, fallbackLipsaText) {
    const raw = (a.cvContinut && String(a.cvContinut).trim()) || ''
    const ePlaceholderIncarcat = raw.startsWith('[CV încărcat:')
    if (a.cvFisierStocat) {
        if (!raw || ePlaceholderIncarcat) return ''
        return raw
    }
    if (raw) return raw
    return fallbackLipsaText
}

const initialStatsForJob = (id) => ({
    pozitiiLibere: Math.max(1, (id % 3) + 1),
    totalCVuri: id % 5,
    cvAcceptate: Math.floor((id % 5) / 2),
    cvRespinse: Math.floor((id % 5) / 3)
})

/** Lista de posturi vine din GET /api/posturi (filtrată pe server după rol și atribuiri). Nu o refiltrăm în client. */

export default function Dashboard({
    posturi = [],
    setPosturi,
    user,
    authToken,
    onRemoteSaveDescriere,
    onRefreshPosturi,
}) {
    const posturiVizibile = useMemo(() => posturi, [posturi])
    const [aplicatiiServer, setAplicatiiServer] = useState([])
    const pipelineSaveTimers = useRef({})
    const [jobStats, setJobStats] = useState({})
    const [aplicantiState, setAplicantiState] = useState({})
    const [candidatDetaliiOpen, setCandidatDetaliiOpen] = useState(null)
    const [hoverEtapa, setHoverEtapa] = useState(null)
    const [recalcAllBusy, setRecalcAllBusy] = useState(false)
    const [recalcOneId, setRecalcOneId] = useState(null)
    const [recalcMessage, setRecalcMessage] = useState('')
    const [vizibilItSavingId, setVizibilItSavingId] = useState(null)

    const poateRecalcScor =
        user?.rol === ROLURI.ADMIN || user?.rol === ROLURI.MANAGER_RECRUTARE

    /** Recrutor / admin / MR pot trimite candidați spre intervievatorii tehnici (vizibilitate în dashboard IT). */
    const poateSetaVizibilitateIt =
        user?.rol === ROLURI.RECRUTOR ||
        user?.rol === ROLURI.ADMIN ||
        user?.rol === ROLURI.MANAGER_RECRUTARE

    const reloadAplicatii = useCallback(async () => {
        if (!authToken) return
        try {
            const rows = await getAplicatiiDashboard(authToken)
            setAplicatiiServer(Array.isArray(rows) ? rows : [])
        } catch {
            setAplicatiiServer([])
        }
    }, [authToken])

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

    const handleRecalcAllMatchScores = async () => {
        if (!authToken || !poateRecalcScor) return
        setRecalcMessage('')
        setRecalcAllBusy(true)
        try {
            const res = await recalcAplicatiiMatchScore(authToken, { onlyMissing: false })
            await reloadAplicatii()
            setRecalcMessage(
                `Recalcul finalizat: procesate ${res?.processed ?? 0}, actualizate ${res?.updated ?? 0}.`
            )
        } catch (e) {
            setRecalcMessage(e?.message || 'Eroare la recalculare.')
        } finally {
            setRecalcAllBusy(false)
        }
    }

    const handleRecalcOneMatchScore = async (aplicatieId) => {
        if (!authToken || aplicatieId == null || !poateRecalcScor) return
        setRecalcMessage('')
        setRecalcOneId(aplicatieId)
        try {
            await recalcAplicatieMatchScore(authToken, aplicatieId, { force: true })
            await reloadAplicatii()
            setRecalcMessage('Scor actualizat pentru această aplicare.')
        } catch (e) {
            setRecalcMessage(e?.message || 'Eroare la recalculare.')
        } finally {
            setRecalcOneId(null)
        }
    }

    const handleToggleVizibilitateIt = async (aplicatieId, vizibil) => {
        if (!authToken || aplicatieId == null || !poateSetaVizibilitateIt) return
        setVizibilItSavingId(aplicatieId)
        try {
            await patchAplicatieVizibilitateIntervievatoriTehnic(authToken, aplicatieId, vizibil)
            await reloadAplicatii()
        } catch (e) {
            alert(e?.message || 'Nu s-a putut salva vizibilitatea pentru intervievatori tehnici.')
        } finally {
            setVizibilItSavingId(null)
        }
    }

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

    const setPrioritateJob = async (jobId, prioritate) => {
        if (!authToken || !onRefreshPosturi) return
        try {
            await patchPost(authToken, jobId, { prioritate })
            await onRefreshPosturi()
        } catch (e) {
            alert(e?.message || 'Nu s-a putut salva prioritatea.')
        }
    }

    const handleReorder = async (draggedJobId, dropTargetJobId, domeniu) => {
        if (draggedJobId === dropTargetJobId || !authToken || !onRefreshPosturi) return
        const jobsInCol = posturiVizibile.filter((p) => p.domeniu === domeniu)
        const sorted = sortJobsDashboard(jobsInCol)
        let orderIds = sorted.map((j) => j.id)
        const from = orderIds.indexOf(draggedJobId)
        const to = orderIds.indexOf(dropTargetJobId)
        if (from === -1 || to === -1) return
        const targetJob = jobsInCol.find((j) => j.id === dropTargetJobId)
        const newPrior = targetJob?.prioritate || 'mica'
        const depId = targetJob?.departamentId
        if (depId == null) return
        orderIds = [...orderIds]
        orderIds.splice(from, 1)
        const newTo = orderIds.indexOf(dropTargetJobId)
        orderIds.splice(newTo, 0, draggedJobId)
        try {
            await patchPost(authToken, draggedJobId, { prioritate: newPrior })
            await putOrdineDashboard(authToken, { departamentId: depId, postIdsOrdered: orderIds })
            await onRefreshPosturi()
        } catch (e) {
            alert(e?.message || 'Nu s-a putut salva ordinea.')
        }
    }

    const handleReorderToEnd = async (draggedJobId, domeniu) => {
        if (!authToken || !onRefreshPosturi) return
        const jobsInCol = posturiVizibile.filter((p) => p.domeniu === domeniu)
        const sorted = sortJobsDashboard(jobsInCol)
        let orderIds = sorted.map((j) => j.id)
        const from = orderIds.indexOf(draggedJobId)
        if (from === -1) return
        const depId = jobsInCol[0]?.departamentId
        if (depId == null) return
        orderIds = [...orderIds]
        orderIds.splice(from, 1)
        orderIds.push(draggedJobId)
        try {
            await patchPost(authToken, draggedJobId, { prioritate: 'mica' })
            await putOrdineDashboard(authToken, { departamentId: depId, postIdsOrdered: orderIds })
            await onRefreshPosturi()
        } catch (e) {
            alert(e?.message || 'Nu s-a putut salva ordinea.')
        }
    }

    const categorii = useMemo(() => {
        const byDomeniu = {}
        posturiVizibile.forEach((p) => {
            if (!byDomeniu[p.domeniu]) byDomeniu[p.domeniu] = []
            byDomeniu[p.domeniu].push(p)
        })
        return Object.entries(byDomeniu).map(([domeniu, jobs]) => ({
            domeniu,
            jobs: sortJobsDashboard(jobs),
        }))
    }, [posturiVizibile])

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
                    dataAplicare: a.dataAplicare,
                    cvNumeFisier: a.cvNumeFisier,
                    cvFisierStocat: !!a.cvFisierStocat,
                    cv: cvContinutPentruAfisare(
                        a,
                        '(Text CV necompletat la aplicare – verificați fișierul atașat în sistem.)'
                    ),
                },
                jobId,
                job,
                aplicatieRaw: a,
            })
        })
        aplicari.sort(compareAplicantiEntries)
        return aplicari
    }, [aplicatiiServer, jobIdsVizibile, jobsVizibileMap])

    const { aplicantiActivi, aplicantiRespinsi } = useMemo(() => {
        const activi = []
        const respinsi = []
        aplicantiVizibili.forEach((entry) => {
            const st = aplicantiState[entry.key]
            if (pipelineAreCandidatRespins(st)) respinsi.push(entry)
            else activi.push(entry)
        })
        activi.sort(compareAplicantiEntries)
        respinsi.sort(compareAplicantiEntries)
        return { aplicantiActivi: activi, aplicantiRespinsi: respinsi }
    }, [aplicantiVizibili, aplicantiState])

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

            const aplicatieId = Number(String(aplicantKey).replace('app-', ''))
            const aplicatieRaw = aplicatiiServer.find((a) => a.id === aplicatieId)
            const matchScore = etapaKey === 'reviewCv' && !st?.reviewAi ? aplicatieRaw?.cvJobMatchScore : null

            return {
                title: label,
                lines: [
                    `Status: ${etapaStatus.replaceAll('_', ' ')}`,
                    matchScore != null ? `Match Score: ${matchScore}%` : null,
                    details.notes ? `Notițe: ${details.notes}` : null,
                    reasons ? `Motive ${isAcceptat ? 'acceptare' : 'respingere'}:` : null,
                    ...(Array.isArray(reasons) ? reasons.map((r) => `- ${r}`) : [])
                ].filter(Boolean)
            }
        }
        if (etapaKey === 'interviuHr' || etapaKey === 'interviuTehnic' || etapaKey === 'interviuManagement') {
            const label =
                etapaKey === 'interviuHr'
                    ? 'Interviu HR'
                    : etapaKey === 'interviuTehnic'
                        ? 'Interviu tehnic'
                        : 'Interviu management'
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

    const scrollToAplicantInLista = (aplicatieId) => {
        if (aplicatieId == null) return
        window.requestAnimationFrame(() => {
            const el = document.getElementById(`dashboard-aplicant-${aplicatieId}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
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

    const renderAplicantCard = (entry, inRespinsZone) => {
        const { key, candidat, job, aplicatieId, aplicatieRaw } = entry
        const state = aplicantiState[key]
        const reviewAi = state?.reviewAi ?? false
        const reviewEnglezaAutomat = state?.reviewEnglezaAutomat ?? true
        const statusEtape = state?.status || {}
        const unlockedUpTo = Number.isFinite(state?.unlockedUpTo) ? state.unlockedUpTo : 0
        const matchScore =
            !reviewAi && aplicatieRaw?.cvJobMatchScore != null
                ? Number(aplicatieRaw.cvJobMatchScore)
                : null
        return (
            <div
                key={key}
                id={aplicatieId != null ? `dashboard-aplicant-${aplicatieId}` : undefined}
                className={inRespinsZone ? 'aplicant-card aplicant-card--respins' : 'aplicant-card'}
            >
                <div className="aplicant-top">
                    <div className="aplicant-identitate">
                        <div className="aplicant-nume">{numeDinEmail(candidat.email)}</div>
                        <div className="aplicant-meta">
                            <span className="aplicant-email">{candidat.email}</span>
                            <span className="aplicant-data-aplicare">
                                Aplicat: {formatDataAplicare(candidat.dataAplicare)}
                            </span>
                            <span className="aplicant-job">
                                Job: <strong>{job?.nume}</strong>
                            </span>
                        </div>
                    </div>
                    <div className="aplicant-actiuni">
                        {poateRecalcScor && aplicatieId != null ? (
                            <button
                                type="button"
                                className="aplicant-btn-recalc"
                                onClick={() => handleRecalcOneMatchScore(aplicatieId)}
                                disabled={recalcOneId === aplicatieId || recalcAllBusy}
                                aria-busy={recalcOneId === aplicatieId}
                                title="Recalculează match score (cuvinte cheie) pentru această aplicare"
                            >
                                {recalcOneId === aplicatieId ? (
                                    <>
                                        <span
                                            className="dashboard-btn-spinner dashboard-btn-spinner--sm"
                                            aria-hidden="true"
                                        />
                                        Se calculează…
                                    </>
                                ) : (
                                    'Recalculează scor'
                                )}
                            </button>
                        ) : null}
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
                    {poateSetaVizibilitateIt && aplicatieId != null ? (
                        <label
                            className="aplicant-toggle aplicant-toggle--vizibil-it"
                            title="Doar candidații bifați apar în dashboardul intervievatorilor tehnici atribuiți acestui post."
                        >
                            <input
                                type="checkbox"
                                checked={!!aplicatieRaw?.vizibilIntervievatoriTehnic}
                                disabled={vizibilItSavingId === aplicatieId}
                                onChange={(ev) => handleToggleVizibilitateIt(aplicatieId, ev.target.checked)}
                            />
                            {vizibilItSavingId === aplicatieId ? (
                                <span className="dashboard-btn-spinner dashboard-btn-spinner--sm" aria-hidden="true" />
                            ) : null}
                            Vizibil pentru intervievatori tehnici
                        </label>
                    ) : null}
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
                                            {et.key === 'reviewCv'
                                                ? matchScore != null
                                                    ? `CV Review manual – Match Score: ${matchScore}%`
                                                    : reviewAi
                                                      ? 'CV Review AI'
                                                      : 'CV Review manual'
                                                : pipelineLabelFor(et.key)}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`pipeline-dot pipeline-dot--${status}${isCurrent ? ' pipeline-dot--current' : ''}`}
                                        onClick={() => cycleStatus(key, et.key)}
                                        disabled={isLocked}
                                        aria-label={`${et.label} (${status.replaceAll('_', ' ')})`}
                                        title={
                                            isLocked
                                                ? `${et.label} (blocat)`
                                                : `${et.label} (${status.replaceAll('_', ' ')})`
                                        }
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
                    Poți da click pe o etapă din pipeline pentru a schimba statusul (în așteptare → acceptat →
                    respins).
                </div>
            </div>
        )
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
                                        dataAplicare: a.dataAplicare,
                                        cvNumeFisier: a.cvNumeFisier,
                                        cvFisierStocat: !!a.cvFisierStocat,
                                        cv: cvContinutPentruAfisare(a, '(Text CV necompletat la aplicare.)'),
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
                                    prioritate={job.prioritate || 'mica'}
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
                                    authToken={authToken}
                                    onScrollToAplicantPipeline={scrollToAplicantInLista}
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

                {poateRecalcScor && aplicantiVizibili.length > 0 ? (
                    <div className="dashboard-aplicanti-recalc-toolbar">
                        <button
                            type="button"
                            className="dashboard-btn-recalc-bulk"
                            onClick={handleRecalcAllMatchScores}
                            disabled={recalcAllBusy}
                            aria-busy={recalcAllBusy}
                        >
                            {recalcAllBusy ? (
                                <>
                                    <span className="dashboard-btn-spinner" aria-hidden="true" />
                                    Se recalculează…
                                </>
                            ) : (
                                'Recalculează scor (toți candidații)'
                            )}
                        </button>
                        {recalcMessage ? (
                            <span className="dashboard-recalc-msg" role="status">
                                {recalcMessage}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                {aplicantiVizibili.length === 0 ? (
                    <p className="dashboard-aplicanti-gol">Nu există candidați care au aplicat la joburile vizibile pentru rolul tău.</p>
                ) : (
                    <div className="dashboard-aplicanti-lista">
                        {aplicantiActivi.map((entry) => renderAplicantCard(entry, false))}
                        {aplicantiRespinsi.length > 0 ? (
                            <div
                                className="dashboard-aplicanti-zona-respinse"
                                role="separator"
                                aria-label="Aplicații respinse"
                            >
                                <div className="dashboard-aplicanti-zona-respinse__line" aria-hidden="true" />
                                <span className="dashboard-aplicanti-zona-respinse__titlu">
                                    Aplicații respinse
                                    <span className="dashboard-aplicanti-zona-respinse__count">
                                        {' '}
                                        ({aplicantiRespinsi.length})
                                    </span>
                                </span>
                                <div className="dashboard-aplicanti-zona-respinse__line" aria-hidden="true" />
                            </div>
                        ) : null}
                        {aplicantiRespinsi.map((entry) => renderAplicantCard(entry, true))}
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
                            <div className="aplicant-modal-row">
                                <span className="aplicant-modal-label">Data aplicării</span>
                                <span className="aplicant-modal-value">
                                    {formatDataAplicare(candidatDetaliiOpen.candidat.dataAplicare)}
                                </span>
                            </div>

                            <div className="aplicant-cv">
                                <h4>CV</h4>
                                <CvFisierLink
                                    authToken={authToken}
                                    aplicatieId={candidatDetaliiOpen.candidat.id}
                                    cvNumeFisier={candidatDetaliiOpen.candidat.cvNumeFisier}
                                    cvFisierStocat={candidatDetaliiOpen.candidat.cvFisierStocat}
                                />
                                {!candidatDetaliiOpen.candidat.cvFisierStocat ? (
                                    <p className="aplicant-cv-hint">Nu există fișier CV încărcat pentru deschidere.</p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
