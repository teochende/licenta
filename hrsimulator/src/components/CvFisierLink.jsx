import { fetchAplicatieCv, openCvFromBlob } from '../api/aplicatiiApi'
import './CvFisierLink.css'

export default function CvFisierLink({ authToken, aplicatieId, cvNumeFisier, cvFisierStocat }) {
  if (!cvFisierStocat || !cvNumeFisier) {
    return null
  }

  const handleClick = async (e) => {
    e.preventDefault()
    try {
      const { blob, filename } = await fetchAplicatieCv(authToken, aplicatieId)
      openCvFromBlob(cvNumeFisier, blob, filename)
    } catch (err) {
      window.alert(err?.message || 'Nu s-a putut încărca fișierul CV.')
    }
  }

  return (
    <div className="cv-fisier-link-wrap">
      <button type="button" className="cv-fisier-link" onClick={handleClick}>
        {cvNumeFisier}
      </button>
    </div>
  )
}
