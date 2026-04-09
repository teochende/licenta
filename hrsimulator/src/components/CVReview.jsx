import './CVReview.css'

export default function CVReview({ totalCVuri = 0, cvAcceptate = 0, cvRespinse = 0 }) {
    return (
        <div className="cv-review">
            <h4 className="cv-review-titlu">Procesare CV-uri</h4>
            <ul className="cv-review-lista">
                <li><span className="cv-review-label">Total CV-uri:</span> <strong>{totalCVuri}</strong></li>
                <li><span className="cv-review-label">CV-uri acceptate:</span> <strong>{cvAcceptate}</strong></li>
                <li><span className="cv-review-label">CV-uri respinse după review:</span> <strong>{cvRespinse}</strong></li>
            </ul>
        </div>
    )
}
