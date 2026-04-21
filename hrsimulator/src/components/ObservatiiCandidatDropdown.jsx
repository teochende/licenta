import { useMemo } from 'react'
import {
  ETAPE_RECRUTARE,
  buildDefaultPipelineState,
  parsePipelineStateJson,
  pipelineStatusLabelRo,
} from '../utils/pipelineDefaults'
import './ObservatiiCandidatDropdown.css'

function safeText(x) {
  return x == null ? '' : String(x)
}

function toLocalTs(iso) {
  if (!iso) return '—'
  try {
    return safeText(iso).replace('T', ' ').slice(0, 16)
  } catch {
    return '—'
  }
}

function extractObservatiiSections(state) {
  const details = state?.details && typeof state.details === 'object' ? state.details : {}
  const status = state?.status && typeof state.status === 'object' ? state.status : {}

  const out = []
  for (const et of ETAPE_RECRUTARE) {
    const d = details?.[et.key]
    if (!d || typeof d !== 'object') continue
    const log = Array.isArray(d.statusNotesLog) ? d.statusNotesLog : []
    const last = d.statusNote != null && safeText(d.statusNote).trim() ? safeText(d.statusNote).trim() : ''
    const hasAny = (last && last !== '(fără observații)') || log.some((e) => safeText(e?.note).trim() && safeText(e?.note).trim() !== '(fără observații)')
    if (!hasAny) continue

    const entries = [...log]
      .filter((e) => safeText(e?.note).trim() && safeText(e?.note).trim() !== '(fără observații)')
      .map((e) => ({
        at: toLocalTs(e?.at),
        status: pipelineStatusLabelRo(e?.status ?? status?.[et.key]),
        note: safeText(e?.note),
      }))
      .reverse()
      .slice(0, 12)

    out.push({
      etapaKey: et.key,
      etapaLabel: et.label,
      lastAt: toLocalTs(d.statusNoteAt),
      lastStatus: pipelineStatusLabelRo(status?.[et.key]),
      lastNote: last && last !== '(fără observații)' ? last : '',
      entries,
    })
  }
  return out
}

export default function ObservatiiCandidatDropdown({ pipelineStateJson, seedNum, aiCvReview }) {
  const parsed = parsePipelineStateJson(pipelineStateJson)
  const state = parsed || buildDefaultPipelineState(seedNum ?? 1, { aiCvReview: !!aiCvReview })

  const sections = useMemo(() => extractObservatiiSections(state), [state])

  if (!sections.length) {
    return <span className="obs-dd__empty">—</span>
  }

  return (
    <details className="obs-dd">
      <summary className="obs-dd__summary">Observații ({sections.length})</summary>
      <div className="obs-dd__body">
        {sections.map((s) => (
          <div key={s.etapaKey} className="obs-dd__section">
            <div className="obs-dd__sectionTitle">
              <strong>{s.etapaLabel}</strong>
              {s.lastStatus ? <span className="obs-dd__badge">{s.lastStatus}</span> : null}
            </div>
            {s.lastNote ? (
              <div className="obs-dd__last">
                <span className="obs-dd__lastMeta">{s.lastAt}</span>
                <div className="obs-dd__lastText">{s.lastNote}</div>
              </div>
            ) : null}
            {s.entries.length ? (
              <ul className="obs-dd__list">
                {s.entries.map((e, idx) => (
                  <li key={idx} className="obs-dd__item">
                    <span className="obs-dd__itemMeta">
                      {e.at} · {e.status}
                    </span>
                    <span className="obs-dd__itemText">{e.note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  )
}

