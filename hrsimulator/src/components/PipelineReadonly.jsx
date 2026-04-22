import { ETAPE_RECRUTARE, STATUS_ETAPA, buildDefaultPipelineState, parsePipelineStateJson } from '../utils/pipelineDefaults'
import './Dashboard.css'

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

export default function PipelineReadonly({ pipelineStateJson, seedNum, aiCvReview }) {
  const parsed = parsePipelineStateJson(pipelineStateJson)
  const state = parsed || buildDefaultPipelineState(seedNum ?? 1, { aiCvReview: !!aiCvReview })
  const statusEtape = state?.status || {}

  return (
    <div className="aplicant-pipeline aplicant-pipeline--readonly">
      <div className="pipeline-track" role="list" aria-label="Pipeline recrutare (read-only)">
        {ETAPE_RECRUTARE.map((et, idx) => {
          const rawStatus = statusEtape[et.key] ?? STATUS_ETAPA.NEUTRU
          const status = rawStatus || STATUS_ETAPA.NEUTRU
          const isCurrent = state?.currentStage === et.key
          return (
            <div key={et.key} className="pipeline-item" role="listitem">
              <div className="pipeline-label-wrap">
                <div className={`pipeline-label pipeline-label--${status}`}>{pipelineLabelFor(et.key)}</div>
              </div>
              <div
                className={`pipeline-dot pipeline-dot--${status}${isCurrent ? ' pipeline-dot--current' : ''}`}
                aria-label={`${et.label}: ${status}`}
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
  )
}

