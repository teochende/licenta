import { Link, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import { createAplicatie } from '../api/aplicatiiApi'
import './aplicare_job.css'

const MAX_VIDEO_SEC = 5 * 60

function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const el = document.createElement('video')
        el.preload = 'metadata'
        el.onloadedmetadata = () => {
            URL.revokeObjectURL(url)
            resolve(el.duration)
        }
        el.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('metadata'))
        }
        el.src = url
        try {
            el.load()
        } catch {
            /* ignore */
        }
    })
}

export default function AplicareJob() {
    const { state } = useLocation()
    const jobSelectat = state ? state.jobSelectat : null
    const [nume, setNume] = useState('')
    const [email, setEmail] = useState('')
    const [cv, setCv] = useState(null)
    const [cvError, setCvError] = useState('')
    const [sending, setSending] = useState(false)
    const [doneMsg, setDoneMsg] = useState('')
    const [video, setVideo] = useState(null)
    const [videoDurationLabel, setVideoDurationLabel] = useState('')
    const [videoError, setVideoError] = useState('')
    const inputCvRef = useRef(null)
    const inputVideoRef = useRef(null)

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

    const handleVideoChange = async (event) => {
        const file = event.target.files[0]
        setVideoError('')
        setVideoDurationLabel('')
        setVideo(null)
        if (!file) {
            return
        }
        const okMime = file.type && file.type.startsWith('video/')
        const okExt = file.name.match(/\.(mp4|webm|mov|mkv|avi|m4v|mpeg|mpg)$/i)
        if (!okMime && !okExt) {
            setVideoError('Selectează un fișier video (ex. MP4, WEBM, MOV).')
            return
        }
        try {
            const dur = await getVideoDuration(file)
            if (dur > MAX_VIDEO_SEC + 0.25) {
                setVideoError('Videoclipul nu poate depăși 5 minute.')
                if (inputVideoRef.current) inputVideoRef.current.value = ''
                return
            }
            setVideo(file)
            const m = Math.floor(dur / 60)
            const s = Math.floor(dur % 60)
            setVideoDurationLabel(`Durată: ${m} min ${s} s`)
        } catch {
            setVideoError('Nu s-a putut verifica durata. Încearcă alt fișier video.')
            if (inputVideoRef.current) inputVideoRef.current.value = ''
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setDoneMsg('')
        setCvError('')
        if (!cv) {
            setCvError('Te rugăm să încarci un CV.')
            return
        }
        if (videoError) {
            setCvError('Corectează eroarea la videoclip înainte de trimitere.')
            return
        }
        setCvError('')
        setSending(true)
        try {
            const fd = new FormData()
            fd.append('postId', String(jobSelectat.id))
            fd.append('numeCandidat', nume.trim())
            fd.append('email', email.trim())
            fd.append('file', cv)
            if (video) {
                fd.append('videoFile', video)
            }
            await createAplicatie(fd)
            setDoneMsg('Aplicarea a fost trimisă cu succes.')
            setNume('')
            setEmail('')
            setCv(null)
            setVideo(null)
            setVideoDurationLabel('')
            setVideoError('')
            if (inputCvRef.current) inputCvRef.current.value = ''
            if (inputVideoRef.current) inputVideoRef.current.value = ''
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

                <section className="aplicare-sec aplicare-sec--video" aria-labelledby="aplicare-sec-video">
                    <h3 id="aplicare-sec-video" className="aplicare-sec__titlu">
                        Videoclip opțional (prezentare)
                    </h3>
                    <p className="aplicare-sec__intro">
                        Poți atașa un videoclip scurt (maxim 5 minute), de exemplu în limba engleză. Recrutorii îl pot
                        deschide din dashboard la fel ca fișierul CV.
                    </p>
                    <div className="campAplicare">
                        <label htmlFor="video-candidat">Fișier video (opțional)</label>
                        <br />
                        <input
                            ref={inputVideoRef}
                            type="file"
                            id="video-candidat"
                            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
                            onChange={handleVideoChange}
                        />
                        {video && (
                            <span className="aplicare-cv-filename">
                                Selectat: {video.name}
                                {videoDurationLabel ? ` · ${videoDurationLabel}` : ''}
                            </span>
                        )}
                        {videoError && <div className="aplicare-alert">{videoError}</div>}
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
