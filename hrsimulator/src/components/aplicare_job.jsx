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
            <div className="pagina-aplicare-job pagina-aplicare-job--gol">
                <h2 className="pagina-aplicare-job__titlu">Aplicare pentru job</h2>
                <p className="pagina-aplicare-job__gol-text">Nu a fost selectat niciun post.</p>
                <Link to="/" className="pagina-aplicare-job__link-inapoi">
                    Înapoi la posturi
                </Link>
            </div>
        )
    }

    return (
        <div className="pagina-aplicare-job">
            <h2 className="pagina-aplicare-job__titlu">Aplicare pentru job</h2>

            <div className="optiuneJob aplicare-job-rezumat">
                <div className="informatiiJob">
                    <h3>{jobSelectat.nume}</h3>
                    <p>
                        {jobSelectat.domeniu} | {jobSelectat.subdomeniu} | {jobSelectat.nivel}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="formularAplicare" encType="multipart/form-data">
                <section className="aplicare-sec" aria-labelledby="aplicare-sec-date">
                    <h3 id="aplicare-sec-date" className="aplicare-sec__titlu">
                        Date personale
                    </h3>
                    <p className="aplicare-sec__intro">Completează datele de contact. Câmpurile marcate cu * sunt obligatorii.</p>
                    <div className="campAplicarePrimul">
                        <label htmlFor="nume-candidat">
                            Nume <span className="aplicare-req" aria-hidden="true">*</span>
                        </label>
                        <br />
                        <input
                            type="text"
                            id="nume-candidat"
                            value={nume}
                            onChange={(event) => setNume(event.target.value)}
                            required
                            autoComplete="name"
                        />
                    </div>
                    <div className="campAplicare">
                        <label htmlFor="email-candidat">
                            Email <span className="aplicare-req" aria-hidden="true">*</span>
                        </label>
                        <br />
                        <input
                            type="email"
                            id="email-candidat"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                </section>

                <section className="aplicare-sec" aria-labelledby="aplicare-sec-cv">
                    <h3 id="aplicare-sec-cv" className="aplicare-sec__titlu">
                        CV și documente
                    </h3>
                    <p className="aplicare-sec__intro">Încarcă un singur fișier (PDF, Word sau text simplu).</p>
                    <div className="campAplicare">
                        <label htmlFor="cv-candidat">
                            Fișier CV <span className="aplicare-req" aria-hidden="true">*</span>
                        </label>
                        <br />
                        <input
                            ref={inputCvRef}
                            type="file"
                            id="cv-candidat"
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={handleCvChange}
                        />
                        {cv && <span className="aplicare-cv-filename">Fișier selectat: {cv.name}</span>}
                        {cvError && <div className="aplicare-alert">{cvError}</div>}
                    </div>
                </section>

                <section className="aplicare-sec aplicare-sec--opțiuni" aria-labelledby="aplicare-sec-opt">
                    <h3 id="aplicare-sec-opt" className="aplicare-sec__titlu">
                        Opțiuni
                    </h3>
                    <div className="campAplicare campAplicareToggle">
                        <label>
                            <input
                                type="checkbox"
                                checked={aiCvReview}
                                onChange={(e) => setAiCvReview(e.target.checked)}
                            />{' '}
                            Review CV AI
                        </label>
                        <div className="hintToggle">
                            Dacă bifați, la trimitere backend-ul trimite CV-ul și descrierea jobului către modulul AI;
                            scorul și observațiile apar automat în dashboard la această aplicare.
                        </div>
                    </div>
                </section>

                <div className="aplicare-form-footer">
                    <button className="butonTrimiteAplicare" type="submit" disabled={sending}>
                        {sending ? 'Se trimite…' : 'Trimite aplicare'}
                    </button>
                </div>
            </form>
            {doneMsg && <p className="aplicare-success">{doneMsg}</p>}
        </div>
    )
}
