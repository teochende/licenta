import { Link, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import { createAplicatie } from '../api/aplicatiiApi'
import './aplicare_job.css'

export default function AplicareJob() {
    const { state } = useLocation()
    const jobSelectat = state ? state.jobSelectat : null
    const [nume, setNume] = useState('')
    const [email, setEmail] = useState('')
    const [cv, setCv] = useState(null)
    const [cvError, setCvError] = useState('')
    const [aiCvReview, setAiCvReview] = useState(false)
    const [sending, setSending] = useState(false)
    const [doneMsg, setDoneMsg] = useState('')
    const inputCvRef = useRef(null)

    const handleCvChange = (event) => {
        const file = event.target.files[0]
        if (file) {
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'text/plain',
            ]
            if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?|txt)$/i)) {
                setCvError('Doar fișiere PDF, DOC/DOCX sau TXT sunt permise.')
                setCv(null)
                return
            }
            setCv(file)
            setCvError('')
        } else {
            setCv(null)
            setCvError('')
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setDoneMsg('')
        if (!cv) {
            setCvError('Te rugăm să încarci un CV.')
            return
        }
        setSending(true)
        try {
            const fd = new FormData()
            fd.append('postId', String(jobSelectat.id))
            fd.append('numeCandidat', nume.trim())
            fd.append('email', email.trim())
            fd.append('file', cv)
            // implicit false: review manual; se trimite doar ca să fie explicit în backend
            fd.append('aiCvReview', aiCvReview ? 'true' : 'false')
            await createAplicatie(fd)
            setDoneMsg('Aplicarea a fost trimisă cu succes.')
            setNume('')
            setEmail('')
            setCv(null)
            setAiCvReview(false)
            if (inputCvRef.current) inputCvRef.current.value = ''
        } catch (e) {
            setCvError(e?.message || 'Eroare la trimiterea aplicării.')
        } finally {
            setSending(false)
        }
    }

    if (!jobSelectat) {
        return (
            <>
                <h2>Aplicare pentru job</h2>
                <p>Nu a fost selectat niciun post.</p>
                <Link to="/">Inapoi la posturi</Link>
            </>
        )
    }

    return (
        <>
            <h2>Aplicare pentru job</h2>
            <div className="optiuneJob">
                <div className="informatiiJob">
                    <h3>{jobSelectat.nume}</h3>
                    <p>
                        {jobSelectat.domeniu} | {jobSelectat.subdomeniu} | {jobSelectat.nivel}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="formularAplicare" encType="multipart/form-data">
                <div className="campAplicarePrimul">
                    <label htmlFor="nume-candidat">Nume</label>
                    <br />
                    <input
                        type="text"
                        id="nume-candidat"
                        value={nume}
                        onChange={(event) => setNume(event.target.value)}
                        required
                    />
                </div>
                <div className="campAplicare">
                    <label htmlFor="email-candidat">Email</label>
                    <br />
                    <input
                        type="email"
                        id="email-candidat"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div className="campAplicare">
                    <label htmlFor="cv-candidat">CV (PDF, DOC/DOCX sau TXT)</label>
                    <br />
                    <input
                        ref={inputCvRef}
                        type="file"
                        id="cv-candidat"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleCvChange}
                    />
                    {cv && <span style={{ marginLeft: '0.5rem' }}>Fișier selectat: {cv.name}</span>}
                    {cvError && <div style={{ color: 'red' }}>{cvError}</div>}
                </div>

                <div className="campAplicare campAplicareToggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={aiCvReview}
                            onChange={(e) => setAiCvReview(e.target.checked)}
                        />{' '}
                        AI CV Review
                    </label>
                    <div className="hintToggle">
                        Implicit este review manual. Bifați doar dacă doriți activarea fluxului AI pentru această aplicare.
                    </div>
                </div>

                <button className="butonTrimiteAplicare" type="submit" disabled={sending}>
                    {sending ? 'Se trimite…' : 'Trimite aplicare'}
                </button>
            </form>
            {doneMsg && <p style={{ color: 'green' }}>{doneMsg}</p>}
        </>
    )
}
