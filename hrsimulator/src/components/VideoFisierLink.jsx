import { fetchAplicatieVideo, openVideoFromBlob } from '../api/aplicatiiApi'
import './CvFisierLink.css'

export default function VideoFisierLink({ authToken, aplicatieId, videoNumeFisier, videoFisierStocat }) {
    if (!videoFisierStocat || !videoNumeFisier) {
        return null
    }

    const handleClick = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            const { blob } = await fetchAplicatieVideo(authToken, aplicatieId)
            openVideoFromBlob(blob)
        } catch (err) {
            window.alert(err?.message || 'Nu s-a putut încărca videoclipul.')
        }
    }

    return (
        <div className="cv-fisier-link-wrap">
            <button type="button" className="cv-fisier-link" onClick={handleClick}>
                {videoNumeFisier}
            </button>
        </div>
    )
}
