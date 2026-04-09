import { useState, useMemo, useEffect } from 'react'
import JobCard from './JobCard'
import candidatiData from '../data/candidati.json'
import { ROLURI } from '../context/login_context'
import './Dashboard.css'

const ORDINE_PRIORITATE = { critic: 0, mare: 1, medie: 2, mica: 3 }

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

export default function Dashboard({ posturi = [], setPosturi, user }) {
    const posturiVizibile = useMemo(
        () => filtreazaPosturiDupaRol(posturi, user),
        [posturi, user]
    )
    const [jobStats, setJobStats] = useState({})
    const [categoryOrder, setCategoryOrder] = useState({})
    const [jobPriorities, setJobPriorities] = useState({})

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

    return (
        <div className="dashboard">
            <h1>Dashboard – Procesarea posturilor</h1>
            {categorii.length === 0 ? (
                <p className="dashboard-gol">
                    {user?.rol === ROLURI.RECRUTOR || user?.rol === ROLURI.INTERVIEVATOR_TEHNIC
                        ? 'Nu aveți posturi atribuite.'
                        : 'Nu există posturi definite.'}
                </p>
            ) : (
                categorii.map(({ domeniu, jobs }) => (
                    <section key={domeniu} className="dashboard-categorie">
                        <h2 className="dashboard-categorie-titlu">{domeniu}</h2>
                        <div className="dashboard-categorie-cards">
                            {jobs.map((job, index) => {
                                const candidatiPentruJob = candidatiData.filter((c) => c.jobIds.includes(job.id))
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
                                    onSaveDescriere={setPosturi ? (jobId, descriere) => setPosturi((prev) => prev.map((p) => (p.id === jobId ? { ...p, descriere } : p))) : undefined}
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
        </div>
    )
}
