import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import JobCard from './JobCard'
import CvFisierLink from './CvFisierLink'
import { ROLURI } from '../context/login_context'
import {
    getAplicatiiDashboard,
    patchAplicatieAiCvReview,
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
    pipelineStatusLabelRo,
    pipelineStatusOptionsForEtapa,
    pipelineHoldAllowedForUser,
    appendPipelineObservatiiToTooltipLines,
    applyPipelineEtapaChange,
    appendPipelineObservationOnly,
    isPipelineOfertaAdmisFromJson,
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
            return 'Review\nCV'
        case 'reviewEngleza':
            return 'Review\nengleză'
        case 'interviuHr':
            return 'Interviu\nHR'
        case 'reviewTehnic':
            return 'Review\ntehnic'
        case 'interviuTehnic':
            return 'Interviu\ntehnic'
        case 'reviewManagement':
            return 'Review\nmanagement'
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
    const an = (a.candidat?.numeCandidat && String(a.candidat.numeCandidat).trim()) || numeDinEmail(a.candidat.email)
    const bn = (b.candidat?.numeCandidat && String(b.candidat.numeCandidat).trim()) || numeDinEmail(b.candidat.email)
    if (an !== bn) return an.localeCompare(bn)
    return String(a.job?.nume || '').localeCompare(String(b.job?.nume || ''))
}

/** Scor mai mare = încă „în lucru” pe pipeline (apare mai sus în listă). */
function pipelineActivitateProcesareScore(st) {
    if (!st?.status || typeof st.status !== 'object') return 0
    let s = 0
    for (const v of Object.values(st.status)) {
        if (v === STATUS_ETAPA.IN_ASTEPTARE) s += 4
        if (v === STATUS_ETAPA.HOLD) s += 2
    }
    return s
}

function compareInProcesarePrioritate(a, b, aplicantiState) {
    const sa = aplicantiState[a.key]
    const sb = aplicantiState[b.key]
    const pa = pipelineActivitateProcesareScore(sa)
    const pb = pipelineActivitateProcesareScore(sb)
    if (pa !== pb) return pb - pa
    return compareAplicantiEntries(a, b)
}

/** Intrare listă dashboard (card candidat) din răspuns API + job vizibil. */
function entryFromAplicatie(a, jobsVizibileMap, jobIdsVizibile) {
    const jobId = a.postId
    if (jobId == null || !jobIdsVizibile.has(jobId)) return null
    const job = jobsVizibileMap[jobId]
    if (!job) return null
    return {
        key: `app-${a.id}`,
        aplicatieId: a.id,
        candidat: {
            id: a.id,
            email: a.email,
            numeCandidat: a.numeCandidat,
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
    }
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

const initialCvStatsForJob = () => ({
    cvAcceptate: 0,
    cvRespinse: 0,
})

function nrOfertaAdmisPentruPost(aplicatii, postId) {
    return aplicatii.filter(
        (a) => a.postId === postId && isPipelineOfertaAdmisFromJson(a.pipelineStateJson)
    ).length
}

function pozitiiLibereLive(job, aplicatii) {
    const cap = job.nrPozitii != null && job.nrPozitii > 0 ? job.nrPozitii : 1
    const ocupate = nrOfertaAdmisPentruPost(aplicatii, job.id)
    return Math.max(0, cap - ocupate)
}

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
    const [listaPage, setListaPage] = useState(0)
    const [listaPageSize, setListaPageSize] = useState(8)
    const [listaQInput, setListaQInput] = useState('')
    const [listaQDebounced, setListaQDebounced] = useState('')
    const [listaPostFilter, setListaPostFilter] = useState('')
    /** toți | activi | respinsi — filtru server pentru lista paginată */
    const [listaStatusFilter, setListaStatusFilter] = useState('toti')
    const [listaRowsRaw, setListaRowsRaw] = useState([])
    const [listaTotal, setListaTotal] = useState(0)
    const [listaLoading, setListaLoading] = useState(false)
    const pipelineSaveTimers = useRef({})
    /** Aplicații cu PATCH pipeline în curs (debounce sau reîncărcare) — nu suprascriem din server până se termină. */
    const pipelinePendingSaveRef = useRef(new Set())
    /** Aplicații la care am trimis deja pipeline implicit la DB (fără JSON inițial). */
    const pipelineDefaultSavedRef = useRef(new Set())
    const [jobStats, setJobStats] = useState({})
    const [aplicantiState, setAplicantiState] = useState({})
    const [candidatDetaliiOpen, setCandidatDetaliiOpen] = useState(null)
    const [hoverEtapa, setHoverEtapa] = useState(null)
    const pipelineTooltipRef = useRef(null)
    const [pipelineInfoModal, setPipelineInfoModal] = useState(null)
    const [pipelineDropdown, setPipelineDropdown] = useState(null)
    const pipelineDropdownRef = useRef(null)
    const [pipelineNoteModal, setPipelineNoteModal] = useState(null)
    const [recalcAllBusy, setRecalcAllBusy] = useState(false)
    const [recalcOneId, setRecalcOneId] = useState(null)
    const [recalcMessage, setRecalcMessage] = useState('')
    const [vizibilItSavingId, setVizibilItSavingId] = useState(null)
    const [aiCvReviewBusyId, setAiCvReviewBusyId] = useState(null)

    const poateRecalcScor =
        user?.rol === ROLURI.ADMIN || user?.rol === ROLURI.MANAGER_RECRUTARE

    /** Recrutor / admin / MR pot trimite candidați spre intervievatorii tehnici (vizibilitate în dashboard IT). */
    const poateSetaVizibilitateIt =
        user?.rol === ROLURI.RECRUTOR ||
        user?.rol === ROLURI.ADMIN ||
        user?.rol === ROLURI.MANAGER_RECRUTARE

    useEffect(() => {
        const t = setTimeout(() => setListaQDebounced(listaQInput.trim()), 350)
        return () => clearTimeout(t)
    }, [listaQInput])

    useEffect(() => {
        setListaPage(0)
    }, [listaQDebounced, listaPostFilter, listaStatusFilter])

    const reloadAplicatiiFull = useCallback(async () => {
        if (!authToken) return
        try {
            const rows = await getAplicatiiDashboard(authToken)
            setAplicatiiServer(Array.isArray(rows) ? rows : [])
        } catch {
            setAplicatiiServer([])
        }
    }, [authToken])

    const loadListaPaged = useCallback(async () => {
        if (!authToken) {
            setListaRowsRaw([])
            setListaTotal(0)
            return
        }
        setListaLoading(true)
        try {
            const data = await getAplicatiiDashboard(authToken, {
                page: listaPage,
                size: listaPageSize,
                q: listaQDebounced || undefined,
                postId: listaPostFilter || undefined,
                listaStatus: listaStatusFilter === 'toti' ? undefined : listaStatusFilter,
            })
            if (data && Array.isArray(data.content)) {
                setListaRowsRaw(data.content)
                setListaTotal(Number(data.totalElements) || 0)
            } else {
                setListaRowsRaw([])
                setListaTotal(0)
            }
        } catch {
            setListaRowsRaw([])
            setListaTotal(0)
        } finally {
            setListaLoading(false)
        }
    }, [authToken, listaPage, listaPageSize, listaQDebounced, listaPostFilter, listaStatusFilter])

    const reloadAplicatii = useCallback(async () => {
        await reloadAplicatiiFull()
        await loadListaPaged()
    }, [reloadAplicatiiFull, loadListaPaged])

    useEffect(() => {
        if (!authToken) {
            pipelineDefaultSavedRef.current.clear()
            pipelinePendingSaveRef.current.clear()
        }
    }, [authToken])

    useEffect(() => {
        if (!authToken) {
            setAplicatiiServer([])
            return
        }
        let cancel = false
        ;(async () => {
            try {
                const rows = await getAplicatiiDashboard(authToken)
                if (!cancel) setAplicatiiServer(Array.isArray(rows) ? rows : [])
            } catch {
                if (!cancel) setAplicatiiServer([])
            }
        })()
        return () => {
            cancel = true
        }
    }, [authToken, posturiVizibile])

    useEffect(() => {
        loadListaPaged()
    }, [loadListaPaged, posturiVizibile])

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

    const handleToggleAiCvReview = async (aplicatieId, checked) => {
        if (!authToken || aplicatieId == null) return
        setAiCvReviewBusyId(aplicatieId)
        try {
            await patchAplicatieAiCvReview(authToken, aplicatieId, checked)
            await reloadAplicatii()
        } catch (e) {
            alert(e?.message || 'Nu s-a putut actualiza Review CV AI (verificați modulul AI și drepturile de acces).')
        } finally {
            setAiCvReviewBusyId(null)
        }
    }

    const schedulePipelinePersist = (aplicatieId, fullState) => {
        if (!authToken || aplicatieId == null) return
        pipelinePendingSaveRef.current.add(aplicatieId)
        const prev = pipelineSaveTimers.current[aplicatieId]
        if (prev) clearTimeout(prev)
        pipelineSaveTimers.current[aplicatieId] = setTimeout(async () => {
            try {
                await patchAplicatiePipeline(authToken, aplicatieId, JSON.stringify(fullState))
                await reloadAplicatii()
            } catch (e) {
                alert(e?.message || 'Starea pipeline nu s-a putut salva pe server.')
            } finally {
                delete pipelineSaveTimers.current[aplicatieId]
                pipelinePendingSaveRef.current.delete(aplicatieId)
            }
        }, 450)
    }

    useEffect(() => {
        setJobStats((prev) => {
            const next = { ...prev }
            posturiVizibile.forEach((p) => {
                if (next[p.id] == null) {
                    next[p.id] = initialCvStatsForJob()
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
            const e = entryFromAplicatie(a, jobsVizibileMap, jobIdsVizibile)
            if (e) aplicari.push(e)
        })
        aplicari.sort(compareAplicantiEntries)
        return aplicari
    }, [aplicatiiServer, jobIdsVizibile, jobsVizibileMap])

    const listaEntries = useMemo(() => {
        const out = []
        listaRowsRaw.forEach((a) => {
            const e = entryFromAplicatie(a, jobsVizibileMap, jobIdsVizibile)
            if (e) out.push(e)
        })
        return out
    }, [listaRowsRaw, jobsVizibileMap, jobIdsVizibile])

    const { listaInProcesare, listaAdmisi, listaRespinsi } = useMemo(() => {
        const inProcesare = []
        const admisi = []
        const respinsi = []
        listaEntries.forEach((entry) => {
            const st = aplicantiState[entry.key]
            if (pipelineAreCandidatRespins(st)) {
                respinsi.push(entry)
                return
            }
            const ofertaAdmis = st?.status?.oferta === STATUS_ETAPA.ACCEPTAT
            const libere = pozitiiLibereLive(entry.job, aplicatiiServer)
            if (ofertaAdmis && libere > 0) {
                admisi.push(entry)
            } else {
                inProcesare.push(entry)
            }
        })
        inProcesare.sort((a, b) => compareInProcesarePrioritate(a, b, aplicantiState))
        admisi.sort(compareAplicantiEntries)
        respinsi.sort(compareAplicantiEntries)
        return { listaInProcesare: inProcesare, listaAdmisi: admisi, listaRespinsi: respinsi }
    }, [listaEntries, aplicantiState, aplicatiiServer])

    const listaTotalPages =
        listaTotal === 0 ? 0 : Math.ceil(listaTotal / listaPageSize)

    const serverPipelineSyncKey = useMemo(
        () =>
            aplicantiVizibili
                .map(({ aplicatieRaw }) => `${aplicatieRaw?.id ?? ''}:${aplicatieRaw?.pipelineStateJson ?? ''}`)
                .join('|'),
        [aplicantiVizibili]
    )

    useEffect(() => {
        setAplicantiState((prev) => {
            const next = { ...prev }
            const mergeFromEntry = ({ key, aplicatieRaw, aplicatieId }) => {
                const aid = aplicatieRaw?.id ?? aplicatieId
                const fromServer = parsePipelineStateJson(aplicatieRaw?.pipelineStateJson)
                if (pipelinePendingSaveRef.current.has(aid)) {
                    if (prev[key] != null) next[key] = prev[key]
                    return
                }
                if (fromServer) {
                    next[key] = fromServer
                } else if (prev[key] != null) {
                    next[key] = prev[key]
                } else {
                    next[key] = buildDefaultPipelineState(aid, { aiCvReview: aplicatieRaw?.aiCvReview })
                }
            }
            aplicantiVizibili.forEach(mergeFromEntry)
            listaEntries.forEach(mergeFromEntry)
            return next
        })
    }, [authToken, serverPipelineSyncKey, aplicantiVizibili, listaEntries])

    /** Prima dată când lipsește pipeline în DB, salvăm starea implicită (același JSON ca în UI). */
    useEffect(() => {
        if (!authToken) return
        aplicantiVizibili.forEach(({ aplicatieRaw, aplicatieId }) => {
            if (aplicatieRaw?.pipelineStateJson) return
            if (pipelineDefaultSavedRef.current.has(aplicatieId)) return
            pipelineDefaultSavedRef.current.add(aplicatieId)
            const def = buildDefaultPipelineState(aplicatieId, { aiCvReview: aplicatieRaw?.aiCvReview })
            patchAplicatiePipeline(authToken, aplicatieId, JSON.stringify(def))
                .then(() => reloadAplicatii())
                .catch(() => {
                    pipelineDefaultSavedRef.current.delete(aplicatieId)
                })
        })
    }, [authToken, aplicantiVizibili, reloadAplicatii])

    const getEtapaTooltip = (aplicantKey, etapaKey) => {
        const st = aplicantiState[aplicantKey]
        const etapaStatus = st?.status?.[etapaKey] ?? STATUS_ETAPA.NEUTRU
        const details = st?.details?.[etapaKey] || {}
        const pipelineNotesLines = []
        appendPipelineObservatiiToTooltipLines(details, pipelineNotesLines)

        if (etapaKey === 'depusCv') {
            const sections = [
                {
                    title: 'Detalii',
                    lines: [
                        `Data depunere: ${details.submittedAt || '—'}`,
                        `Sursă: ${details.source || '—'}`,
                    ],
                },
            ]
            if (pipelineNotesLines.length) sections.push({ title: 'Observații', lines: pipelineNotesLines })
            return { title: 'Depus CV', sections, lines: sections.flatMap((s) => [s.title, ...s.lines]) }
        }
        if (etapaKey === 'reviewCv' || etapaKey === 'reviewEngleza' || etapaKey === 'reviewTehnic' || etapaKey === 'reviewManagement') {
            const isAcceptat = etapaStatus === STATUS_ETAPA.ACCEPTAT
            const isRespins = etapaStatus === STATUS_ETAPA.RESPINS
            const reasons = isAcceptat ? details.acceptReasons : isRespins ? details.rejectReasons : null
            const aplicatieId = Number(String(aplicantKey).replace('app-', ''))
            const aplicatieRaw = aplicatiiServer.find((a) => a.id === aplicatieId)
            const reviewAiEfectiv = !!aplicatieRaw?.aiCvReview

            const label =
                etapaKey === 'reviewCv'
                    ? (reviewAiEfectiv ? 'Review CV AI' : 'Review CV HR')
                    : etapaKey === 'reviewEngleza'
                        ? (st?.reviewEnglezaAutomat ? 'Review CV engleză (automat)' : 'Review CV engleză (manual)')
                        : etapaKey === 'reviewTehnic'
                            ? 'Review CV tehnic'
                            : 'Review CV management'

            const matchScoreManual =
                etapaKey === 'reviewCv' && aplicatieRaw?.cvJobMatchScore != null
                    ? aplicatieRaw.cvJobMatchScore
                    : null
            const matchScoreAi =
                etapaKey === 'reviewCv' && aplicatieRaw?.aiCvMatchScore != null
                    ? aplicatieRaw.aiCvMatchScore
                    : null

            const sections = [
                { title: 'Status', lines: [pipelineStatusLabelRo(etapaStatus)] },
            ]
            if (etapaKey === 'reviewCv') {
                if (matchScoreManual != null) sections.push({ title: 'Scor potrivire (manual)', lines: [`${matchScoreManual}%`] })
                if (matchScoreAi != null) sections.push({ title: 'Scor potrivire (AI)', lines: [`${matchScoreAi}%`] })
                if (reviewAiEfectiv) {
                    const obs = aplicatieRaw?.aiCvObservatii ? String(aplicatieRaw.aiCvObservatii) : ''
                    const concl = aplicatieRaw?.aiCvConcluzii ? String(aplicatieRaw.aiCvConcluzii) : ''
                    const obsLines = obs
                        .split(/\n+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    if (obsLines.length) sections.push({ title: 'Observații AI', lines: obsLines })
                    if (concl.trim()) sections.push({ title: 'Concluzii AI', lines: [concl.trim()] })
                }
            }
            if (details.notes) sections.push({ title: 'Notițe', lines: [String(details.notes)] })
            if (reasons) {
                const rr = Array.isArray(reasons) ? reasons.map((r) => `- ${r}`) : [String(reasons)]
                sections.push({ title: `Motive ${isAcceptat ? 'acceptare' : 'respingere'}`, lines: rr })
            }
            if (pipelineNotesLines.length) sections.push({ title: 'Observații (istoric)', lines: pipelineNotesLines })

            return { title: label, sections, lines: sections.flatMap((s) => [s.title, ...s.lines]) }
        }
        if (etapaKey === 'interviuHr' || etapaKey === 'interviuTehnic' || etapaKey === 'interviuManagement') {
            const label =
                etapaKey === 'interviuHr'
                    ? 'Interviu HR'
                    : etapaKey === 'interviuTehnic'
                        ? 'Interviu tehnic'
                        : 'Interviu management'
            const sections = [
                { title: 'Status', lines: [pipelineStatusLabelRo(etapaStatus)] },
                { title: 'Programare', lines: [`${details.scheduledAt || '—'}`] },
            ]
            if (details.interviewerNotes) sections.push({ title: 'Notițe', lines: [String(details.interviewerNotes)] })
            if (pipelineNotesLines.length) sections.push({ title: 'Observații (istoric)', lines: pipelineNotesLines })
            return { title: label, sections, lines: sections.flatMap((s) => [s.title, ...s.lines]) }
        }
        if (etapaKey === 'oferta') {
            const sections = [{ title: 'Status', lines: [pipelineStatusLabelRo(etapaStatus)] }]
            if (details.offerStatus) sections.push({ title: 'Ofertă', lines: [String(details.offerStatus)] })
            if (details.notes) sections.push({ title: 'Notițe', lines: [String(details.notes)] })
            if (pipelineNotesLines.length) sections.push({ title: 'Observații (istoric)', lines: pipelineNotesLines })
            return { title: 'Ofertă', sections, lines: sections.flatMap((s) => [s.title, ...s.lines]) }
        }
        const sections = [{ title: 'Status', lines: [pipelineStatusLabelRo(etapaStatus)] }]
        if (pipelineNotesLines.length) sections.push({ title: 'Observații (istoric)', lines: pipelineNotesLines })
        return { title: etapaKey, sections, lines: sections.flatMap((s) => [s.title, ...s.lines]) }
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

    const openPipelineInfoModal = (aplicantKey, etapaKey) => {
        const tip = getEtapaTooltip(aplicantKey, etapaKey)
        setPipelineInfoModal({
            aplicantKey,
            etapaKey,
            title: tip?.title || 'Detalii',
            sections: Array.isArray(tip?.sections) ? tip.sections : [],
            lines: Array.isArray(tip?.lines) ? tip.lines : [],
        })
    }

    useLayoutEffect(() => {
        if (!hoverEtapa?.aplicantKey || !hoverEtapa?.etapaKey) return
        const el = pipelineTooltipRef.current
        if (!el) return
        const pad = 12
        el.style.setProperty('--pipeline-tip-dx', '0px')
        el.style.setProperty('--pipeline-tip-dy', '0px')
        const r = el.getBoundingClientRect()
        let dx = 0
        let dy = 0
        if (r.left < pad) dx = pad - r.left
        if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right
        if (r.top < pad) dy = pad - r.top
        if (r.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - r.bottom
        el.style.setProperty('--pipeline-tip-dx', `${dx}px`)
        el.style.setProperty('--pipeline-tip-dy', `${dy}px`)
    }, [hoverEtapa])

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

    const scrollToListaAplicatii = () => {
        window.requestAnimationFrame(() => {
            const el = document.getElementById('dashboard-aplicanti-section')
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    }

    const handleSelectJobFromCard = (job) => {
        if (!job?.id) return
        setListaPostFilter(String(job.id))
        scrollToListaAplicatii()
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

    const openPipelineStatusDropdown = (ev, aplicantKey, etapaKey) => {
        ev.preventDefault()
        ev.stopPropagation()
        const rect = ev.currentTarget.getBoundingClientRect()
        setPipelineDropdown({
            aplicantKey,
            etapaKey,
            anchorLeft: rect.left,
            anchorTop: rect.top,
            anchorBottom: rect.bottom,
            minWidth: Math.max(220, rect.width),
        })
    }

    const closePipelineDropdown = useCallback(() => setPipelineDropdown(null), [])

    /** Repoziționează dropdown-ul în viewport cu înălțime scrollabilă ca toate statusurile să fie accesibile. */
    useLayoutEffect(() => {
        if (!pipelineDropdown) return undefined
        const el = pipelineDropdownRef.current
        if (!el) return undefined

        const position = () => {
            const pad = 12
            const vh = window.innerHeight
            const vw = window.innerWidth
            const { anchorLeft, anchorTop, anchorBottom } = pipelineDropdown
            const h = el.offsetHeight
            const w = el.offsetWidth

            let top = anchorBottom + 6
            if (top + h > vh - pad) {
                const above = anchorTop - h - 6
                top = above >= pad ? above : Math.max(pad, vh - pad - h)
            }

            let left = anchorLeft
            if (left + w > vw - pad) left = Math.max(pad, vw - w - pad)
            if (left < pad) left = pad

            const maxH = Math.max(200, Math.min((85 * vh) / 100, vh - top - pad))
            el.style.top = `${top}px`
            el.style.left = `${left}px`
            el.style.maxHeight = `${maxH}px`
        }

        position()
        window.addEventListener('resize', position)
        return () => {
            window.removeEventListener('resize', position)
            el.style.top = ''
            el.style.left = ''
            el.style.maxHeight = ''
        }
    }, [pipelineDropdown])

    useEffect(() => {
        if (!pipelineDropdown) return undefined
        const onDown = (e) => {
            const root = pipelineDropdownRef.current
            if (root && !root.contains(e.target)) closePipelineDropdown()
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [pipelineDropdown, closePipelineDropdown])

    useEffect(() => {
        if (!pipelineDropdown && !pipelineNoteModal && !pipelineInfoModal) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') {
                closePipelineDropdown()
                setPipelineNoteModal(null)
                setPipelineInfoModal(null)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pipelineDropdown, pipelineNoteModal, pipelineInfoModal, closePipelineDropdown])

    const pickPipelineStatusForModal = (status) => {
        if (!pipelineDropdown) return
        setPipelineNoteModal({
            aplicantKey: pipelineDropdown.aplicantKey,
            etapaKey: pipelineDropdown.etapaKey,
            status,
            noteDraft: '',
        })
        closePipelineDropdown()
    }

    const confirmPipelineStatusNote = () => {
        if (!pipelineNoteModal) return
        const { aplicantKey, etapaKey, status, noteDraft } = pipelineNoteModal
        if (status === STATUS_ETAPA.HOLD && !pipelineHoldAllowedForUser(user?.rol, etapaKey)) {
            window.alert('Statusul Hold poate fi setat doar de administrator, intervievatorul tehnic sau managerul de departament, la etapele review tehnic, interviu tehnic, review management și interviu management.')
            setPipelineNoteModal(null)
            return
        }
        const aid = aplicatieIdFromKey(aplicantKey)
        setAplicantiState((prev) => {
            const cur = prev[aplicantKey]
            if (!cur) return prev
            const prevStatus = cur.status?.[etapaKey]
            const updated =
                prevStatus === status
                    ? appendPipelineObservationOnly(cur, etapaKey, noteDraft)
                    : applyPipelineEtapaChange(cur, etapaKey, status, noteDraft)
            if (!updated) return prev
            schedulePipelinePersist(aid, updated)
            return { ...prev, [aplicantKey]: updated }
        })
        setPipelineNoteModal(null)
    }

    const renderAplicantCard = (entry, inRespinsZone, inAdmisZone = false) => {
        const { key, candidat, job, aplicatieId, aplicatieRaw } = entry
        const state = aplicantiState[key]
        const reviewAiEfectiv = !!aplicatieRaw?.aiCvReview
        const reviewEnglezaAutomat = state?.reviewEnglezaAutomat ?? true
        const statusEtape = state?.status || {}
        const unlockedUpTo = Number.isFinite(state?.unlockedUpTo) ? state.unlockedUpTo : 0
        const matchScoreManual =
            aplicatieRaw?.cvJobMatchScore != null ? Number(aplicatieRaw.cvJobMatchScore) : null
        const matchScoreAi =
            aplicatieRaw?.aiCvMatchScore != null ? Number(aplicatieRaw.aiCvMatchScore) : null
        const cardClass = ['aplicant-card']
        if (inRespinsZone) cardClass.push('aplicant-card--respins')
        else if (inAdmisZone) cardClass.push('aplicant-card--admis')

        return (
            <div
                key={key}
                id={aplicatieId != null ? `dashboard-aplicant-${aplicatieId}` : undefined}
                className={cardClass.join(' ')}
            >
                <div className="aplicant-top">
                    <div className="aplicant-identitate">
                        <div className="aplicant-nume">
                            {(candidat.numeCandidat && String(candidat.numeCandidat).trim()) ||
                                numeDinEmail(candidat.email)}
                        </div>
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
                        {poateRecalcScor && aplicatieId != null && !aplicatieRaw?.aiCvReview ? (
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
                    <label
                        className="aplicant-toggle"
                        title={
                            aiCvReviewBusyId === aplicatieId
                                ? 'Se rulează analiza AI…'
                                : 'Bifați pentru a trimite CV-ul și descrierea jobului la modulul AI; debifați pentru scor manual (cuvinte cheie).'
                        }
                    >
                        <input
                            type="checkbox"
                            checked={reviewAiEfectiv}
                            disabled={aiCvReviewBusyId === aplicatieId}
                            onChange={(ev) => handleToggleAiCvReview(aplicatieId, ev.target.checked)}
                        />
                        {aiCvReviewBusyId === aplicatieId ? (
                            <span className="dashboard-btn-spinner dashboard-btn-spinner--sm" aria-hidden="true" />
                        ) : null}
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
                            const isCurrent =
                                idx === unlockedUpTo &&
                                (status === STATUS_ETAPA.IN_ASTEPTARE || status === STATUS_ETAPA.HOLD)
                            return (
                                <div key={et.key} className="pipeline-item" role="listitem">
                                    <div
                                        className="pipeline-label-wrap"
                                        onMouseEnter={(e) => onHoverEticheta(key, et.key, e.currentTarget)}
                                        onMouseMove={(e) => onHoverEticheta(key, et.key, e.currentTarget)}
                                        onMouseLeave={clearHoverEticheta}
                                        onClick={() => openPipelineInfoModal(key, et.key)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                openPipelineInfoModal(key, et.key)
                                            }
                                        }}
                                    >
                                        <div className={`pipeline-label pipeline-label--${status}`}>
                                            {et.key === 'reviewCv'
                                                ? (matchScoreManual != null || matchScoreAi != null)
                                                    ? reviewAiEfectiv
                                                        ? `Manual ${matchScoreManual ?? '—'}%\nAI ${matchScoreAi ?? '—'}%`
                                                        : `Review manual\n${matchScoreManual ?? '—'}%`
                                                    : reviewAiEfectiv
                                                      ? 'Review\nCV AI'
                                                      : 'Review\nCV HR'
                                                : pipelineLabelFor(et.key)}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`pipeline-dot pipeline-dot--${status}${isCurrent ? ' pipeline-dot--current' : ''}`}
                                        onClick={(ev) => openPipelineStatusDropdown(ev, key, et.key)}
                                        disabled={isLocked}
                                        aria-label={`${et.label}, status ${pipelineStatusLabelRo(status)}`}
                                        aria-haspopup="listbox"
                                        title={
                                            isLocked
                                                ? `${et.label} (blocat)`
                                                : `${et.label} — click pentru a schimba statusul`
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
                    Click pe bulina unei etape: listă de statusuri (Admis, Respins, În procesare; Hold doar pentru
                    administrator / intervievator tehnic / manager departament, la review & interviu tehnic și
                    management). După alegere, notezi observațiile — apar la hover pe etichetă.
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
                                        numeCandidat: a.numeCandidat,
                                        dataAplicare: a.dataAplicare,
                                        cvNumeFisier: a.cvNumeFisier,
                                        cvFisierStocat: !!a.cvFisierStocat,
                                        cv: cvContinutPentruAfisare(a, '(Text CV necompletat la aplicare.)'),
                                        jobIds: [job.id],
                                    }))
                                const nrCandidatiAplicati = candidatiPentruJob.length
                                const statsCuCandidati = {
                                    ...jobStats[job.id],
                                    totalCVuri: nrCandidatiAplicati,
                                    pozitiiLibere: pozitiiLibereLive(job, aplicatiiServer),
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
                                    onCardClick={handleSelectJobFromCard}
                                />
                                )
                            })}
                        </div>
                    </section>
                ))
            )}

            <section className="dashboard-aplicanti" id="dashboard-aplicanti-section">
                <div className="dashboard-aplicanti-header">
                    <h2 className="dashboard-aplicanti-titlu">Candidați pentru joburile vizibile</h2>
                    <span className="dashboard-aplicanti-count" title="Total în lista curentă (după filtre)">
                        {listaTotal} aplicări
                        {aplicantiVizibili.length !== listaTotal ? (
                            <span className="dashboard-aplicanti-count-hint">
                                {' '}
                                · {aplicantiVizibili.length} în total pentru rolul tău
                            </span>
                        ) : null}
                    </span>
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
                ) : listaTotal === 0 && !listaLoading ? (
                    <p className="dashboard-aplicanti-gol">
                        Niciun rezultat pentru filtrele curente. Modificați căutarea sau resetați filtrele.
                    </p>
                ) : (
                    <>
                        <div className="dashboard-candidati-toolbar" role="search">
                            <label className="dashboard-candidati-toolbar__field">
                                <span className="dashboard-candidati-toolbar__label">Căutare</span>
                                <input
                                    type="search"
                                    placeholder="Nume, email, job, departament…"
                                    value={listaQInput}
                                    onChange={(ev) => setListaQInput(ev.target.value)}
                                    aria-label="Căutare candidați"
                                />
                            </label>
                            <label className="dashboard-candidati-toolbar__field">
                                <span className="dashboard-candidati-toolbar__label">Post</span>
                                <select
                                    value={listaPostFilter}
                                    onChange={(ev) => setListaPostFilter(ev.target.value)}
                                    aria-label="Filtru post"
                                >
                                    <option value="">Toate posturile</option>
                                    {posturiVizibile.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nume} ({p.domeniu})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="dashboard-candidati-toolbar__field">
                                <span className="dashboard-candidati-toolbar__label">Stare</span>
                                <select
                                    value={listaStatusFilter}
                                    onChange={(ev) => setListaStatusFilter(ev.target.value)}
                                    aria-label="Filtru stare candidat"
                                >
                                    <option value="toti">Toți (activi + respinși)</option>
                                    <option value="activi">Doar activi</option>
                                    <option value="respinsi">Doar respinși</option>
                                </select>
                            </label>
                            <label className="dashboard-candidati-toolbar__field dashboard-candidati-toolbar__field--narrow">
                                <span className="dashboard-candidati-toolbar__label">Pe pagină</span>
                                <select
                                    value={listaPageSize}
                                    onChange={(ev) => {
                                        setListaPageSize(Number(ev.target.value))
                                        setListaPage(0)
                                    }}
                                    aria-label="Mărime pagină"
                                >
                                    {[5, 8, 10, 15, 20].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {listaLoading ? (
                            <p className="dashboard-candidati-loading">Se încarcă lista…</p>
                        ) : null}
                        <div className="dashboard-aplicanti-lista">
                            {listaInProcesare.map((entry) => renderAplicantCard(entry, false))}
                            {listaAdmisi.length > 0 ? (
                                <div
                                    className="dashboard-aplicanti-zona-admisi"
                                    role="separator"
                                    aria-label="Candidați admiși (ofertă)"
                                >
                                    <div className="dashboard-aplicanti-zona-admisi__line" aria-hidden="true" />
                                    <span className="dashboard-aplicanti-zona-admisi__titlu">
                                        Admiși
                                        <span className="dashboard-aplicanti-zona-admisi__count">
                                            {' '}
                                            ({listaAdmisi.length} pe această pagină)
                                        </span>
                                    </span>
                                    <div className="dashboard-aplicanti-zona-admisi__line" aria-hidden="true" />
                                </div>
                            ) : null}
                            {listaAdmisi.map((entry) => renderAplicantCard(entry, false, true))}
                            {listaRespinsi.length > 0 ? (
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
                                            ({listaRespinsi.length} pe această pagină)
                                        </span>
                                    </span>
                                    <div className="dashboard-aplicanti-zona-respinse__line" aria-hidden="true" />
                                </div>
                            ) : null}
                            {listaRespinsi.map((entry) => renderAplicantCard(entry, true))}
                        </div>
                        {listaTotalPages > 0 ? (
                            <div className="dashboard-candidati-pager" aria-label="Paginare candidați">
                                <span className="dashboard-candidati-pager__meta">
                                    Pagina {listaPage + 1} din {listaTotalPages}
                                </span>
                                <div className="dashboard-candidati-pager__btns">
                                    <button
                                        type="button"
                                        className="dashboard-candidati-pager__btn"
                                        disabled={listaPage <= 0 || listaLoading}
                                        onClick={() => setListaPage((p) => Math.max(0, p - 1))}
                                    >
                                        Înapoi
                                    </button>
                                    <button
                                        type="button"
                                        className="dashboard-candidati-pager__btn"
                                        disabled={listaPage + 1 >= listaTotalPages || listaLoading}
                                        onClick={() => setListaPage((p) => p + 1)}
                                    >
                                        Înainte
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </section>

            {typeof document !== 'undefined' &&
                hoverEtapa?.aplicantKey &&
                hoverEtapa?.etapaKey &&
                createPortal(
                    (() => {
                        const tip = getEtapaTooltip(hoverEtapa.aplicantKey, hoverEtapa.etapaKey)
                        return (
                            <div
                                ref={pipelineTooltipRef}
                                className="pipeline-tooltip pipeline-tooltip--fixed"
                                role="tooltip"
                                style={{
                                    left: `${hoverEtapa.anchorX}px`,
                                    top: `${hoverEtapa.anchorY}px`,
                                }}
                            >
                                <div className="pipeline-tooltip-title">{tip.title}</div>
                                <div className="pipeline-tooltip-body">
                                    {Array.isArray(tip.sections) && tip.sections.length ? (
                                        tip.sections.map((sec, si) => (
                                            <div key={si} className="pipeline-tooltip-section">
                                                <div className="pipeline-tooltip-section-title">
                                                    <strong>{sec.title}</strong>
                                                </div>
                                                <div className="pipeline-tooltip-section-body">
                                                    {(sec.lines || []).map((ln, li) => (
                                                        <div key={li} className="pipeline-tooltip-line">
                                                            {ln}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        (tip.lines || []).map((ln, i) => (
                                            <div key={i} className="pipeline-tooltip-line">
                                                {ln}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })(),
                    document.body
                )}

            {typeof document !== 'undefined' &&
                pipelineInfoModal &&
                createPortal(
                    <div className="pipeline-info-modal-overlay" onClick={() => setPipelineInfoModal(null)}>
                        <div
                            className="pipeline-info-modal"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div className="pipeline-info-modal-header">
                                <h3 className="pipeline-info-modal-title">{pipelineInfoModal.title}</h3>
                                <button
                                    type="button"
                                    className="pipeline-info-modal-close"
                                    onClick={() => setPipelineInfoModal(null)}
                                    aria-label="Închide"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="pipeline-info-modal-body">
                                {Array.isArray(pipelineInfoModal.sections) && pipelineInfoModal.sections.length ? (
                                    pipelineInfoModal.sections.map((sec, si) => (
                                        <div key={si} className="pipeline-info-section">
                                            <div className="pipeline-info-section-title">
                                                <strong>{sec.title}</strong>
                                            </div>
                                            <div className="pipeline-info-section-body">
                                                {(sec.lines || []).map((ln, li) => (
                                                    <div key={li} className="pipeline-info-line">
                                                        {ln}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    (pipelineInfoModal.lines || []).map((ln, i) => (
                                        <div key={i} className="pipeline-info-line">
                                            {ln}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                pipelineDropdown &&
                createPortal(
                    <div
                        ref={pipelineDropdownRef}
                        className="pipeline-status-dropdown"
                        role="listbox"
                        aria-label="Alege status etapă"
                        style={{
                            position: 'fixed',
                            left: `${Math.max(10, pipelineDropdown.anchorLeft)}px`,
                            top: `${pipelineDropdown.anchorBottom + 6}px`,
                            minWidth: `${pipelineDropdown.minWidth}px`,
                            width: 'min(320px, calc(100vw - 16px))',
                        }}
                    >
                        <div className="pipeline-status-dropdown__head">Alege statusul</div>
                        <div className="pipeline-status-dropdown__scroll">
                        {pipelineStatusOptionsForEtapa(user?.rol, pipelineDropdown.etapaKey).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                className={`pipeline-status-dropdown__btn pipeline-status-dropdown__btn--${opt.value}`}
                                onClick={() => pickPipelineStatusForModal(opt.value)}
                            >
                                <span className="pipeline-status-dropdown__swatch" aria-hidden="true" />
                                <span className="pipeline-status-dropdown__text">
                                    <span className="pipeline-status-dropdown__label">{opt.label}</span>
                                    <span className="pipeline-status-dropdown__desc">{opt.description}</span>
                                </span>
                            </button>
                        ))}
                        </div>
                    </div>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                pipelineNoteModal &&
                createPortal(
                    <div
                        className="pipeline-note-modal-overlay"
                        role="presentation"
                        onClick={() => setPipelineNoteModal(null)}
                    >
                        <div
                            className="pipeline-note-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="pipeline-note-modal-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 id="pipeline-note-modal-title" className="pipeline-note-modal__title">
                                Observații —{' '}
                                {ETAPE_RECRUTARE.find((e) => e.key === pipelineNoteModal.etapaKey)?.label ?? 'Etapă'}{' '}
                                ({pipelineStatusLabelRo(pipelineNoteModal.status)})
                            </h3>
                            <p className="pipeline-note-modal__hint">
                                Aceste note sunt salvate în pipeline și apar la hover pe eticheta etapei.
                            </p>
                            <textarea
                                className="pipeline-note-modal__textarea"
                                rows={5}
                                value={pipelineNoteModal.noteDraft}
                                onChange={(e) =>
                                    setPipelineNoteModal((m) =>
                                        m ? { ...m, noteDraft: e.target.value } : m
                                    )
                                }
                                placeholder="Ex. motivul respingerii, feedback de la interviu, următorii pași…"
                            />
                            <div className="pipeline-note-modal__actions">
                                <button type="button" className="pipeline-note-modal__btn-cancel" onClick={() => setPipelineNoteModal(null)}>
                                    Anulare
                                </button>
                                <button type="button" className="pipeline-note-modal__btn-save" onClick={confirmPipelineStatusNote}>
                                    Salvează statusul
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
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
