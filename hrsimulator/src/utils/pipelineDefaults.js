export const ETAPE_RECRUTARE = [
  { key: 'depusCv', label: 'Depus CV' },
  { key: 'reviewCv', label: 'Review CV (HR / AI)' },
  { key: 'reviewEngleza', label: 'Review engleză' },
  { key: 'interviuHr', label: 'Interviu HR' },
  { key: 'reviewTehnic', label: 'Review tehnic' },
  { key: 'interviuTehnic', label: 'Interviu tehnic' },
  { key: 'reviewManagement', label: 'Review management' },
  { key: 'interviuManagement', label: 'Interviu management' },
  { key: 'oferta', label: 'Ofertă' },
]

export const STATUS_ETAPA = {
  ACCEPTAT: 'acceptat',
  RESPINS: 'respins',
  IN_ASTEPTARE: 'in_asteptare',
  NEUTRU: 'neutru',
  /** Pauză / în așteptare extinsă — nu avansează automat etapele următoare. */
  HOLD: 'hold',
}

/** Opțiuni afișate la schimbarea manuală a stării unei etape (dropdown + culori). */
export const PIPELINE_STATUS_UI_OPTIONS = [
  { value: STATUS_ETAPA.ACCEPTAT, label: 'Admis', description: 'Etapa este încheiată cu succes' },
  { value: STATUS_ETAPA.RESPINS, label: 'Respins', description: 'Candidatul nu trece această etapă' },
  { value: STATUS_ETAPA.IN_ASTEPTARE, label: 'În procesare', description: 'Etapa este în curs' },
  {
    value: STATUS_ETAPA.HOLD,
    label: 'Hold',
    description: 'Pauză (admin, intervievator tehnic sau manager departament — etape tehnice & management)',
  },
]

/** Etape unde statusul Hold poate fi setat (în UI, de rolurile de mai jos). */
export const PIPELINE_HOLD_ALLOWED_ETAPA_KEYS = new Set([
  'reviewTehnic',
  'interviuTehnic',
  'reviewManagement',
  'interviuManagement',
])

const PIPELINE_HOLD_ALLOWED_ROLS = new Set(['admin', 'intervievator_tehnic', 'manager_departament'])

export function pipelineHoldAllowedForUser(rol, etapaKey) {
  if (etapaKey == null || typeof etapaKey !== 'string') return false
  if (!PIPELINE_HOLD_ALLOWED_ETAPA_KEYS.has(etapaKey)) return false
  return PIPELINE_HOLD_ALLOWED_ROLS.has(String(rol || ''))
}

/** Lista de opțiuni pentru dropdown la etapa curentă (fără Hold dacă nu e permis). */
export function pipelineStatusOptionsForEtapa(rol, etapaKey) {
  if (pipelineHoldAllowedForUser(rol, etapaKey)) return PIPELINE_STATUS_UI_OPTIONS
  return PIPELINE_STATUS_UI_OPTIONS.filter((o) => o.value !== STATUS_ETAPA.HOLD)
}

export function pipelineStatusLabelRo(status) {
  switch (status) {
    case STATUS_ETAPA.ACCEPTAT:
      return 'Admis'
    case STATUS_ETAPA.RESPINS:
      return 'Respins'
    case STATUS_ETAPA.IN_ASTEPTARE:
      return 'În procesare'
    case STATUS_ETAPA.HOLD:
      return 'Hold'
    case STATUS_ETAPA.NEUTRU:
      return 'Neutru'
    default:
      return String(status || '').replaceAll('_', ' ') || '—'
  }
}

/** Adaugă în tooltip observațiile salvate la schimbarea stării. */
export function appendPipelineObservatiiToTooltipLines(details, lines) {
  if (!details || typeof details !== 'object' || !Array.isArray(lines)) return
  const note = details.statusNote
  if (note != null && String(note).trim()) {
    lines.push(`Observații (ultima modificare): ${String(note).trim()}`)
  }
  const log = details.statusNotesLog
  if (Array.isArray(log) && log.length > 0) {
    lines.push('Istoric observații:')
    const tail = [...log].reverse().slice(0, 8)
    for (const e of tail) {
      const t = e?.at ? String(e.at).replace('T', ' ').slice(0, 16) : '—'
      const lab = pipelineStatusLabelRo(e?.status)
      lines.push(`  ${t} · ${lab} — ${e?.note != null ? String(e.note) : '—'}`)
    }
  }
}

/**
 * Aplică o nouă stare pe etapă + note (pentru persistare în JSON).
 * @param {object} currentState
 * @param {string} etapaKey
 * @param {string} nextStatus
 * @param {string} [noteRaw]
 * @returns {object|null}
 */
export function applyPipelineEtapaChange(currentState, etapaKey, nextStatus, noteRaw) {
  if (!currentState || typeof currentState !== 'object') return null
  const etapaIndex = ETAPE_RECRUTARE.findIndex((e) => e.key === etapaKey)
  if (etapaIndex === -1) return null
  const unlockedUpTo = Number.isFinite(currentState.unlockedUpTo) ? currentState.unlockedUpTo : 0
  if (etapaIndex > unlockedUpTo) return null

  const prevDetails =
    currentState.details?.[etapaKey] && typeof currentState.details[etapaKey] === 'object'
      ? { ...currentState.details[etapaKey] }
      : {}
  const trimmed = noteRaw != null ? String(noteRaw).trim() : ''
  const noteLine = trimmed || '(fără observații)'
  const logEntry = {
    at: new Date().toISOString(),
    status: nextStatus,
    note: noteLine,
  }
  const prevLog = Array.isArray(prevDetails.statusNotesLog) ? prevDetails.statusNotesLog : []
  const statusNotesLog = [...prevLog, logEntry].slice(-16)

  let nextState = {
    ...currentState,
    status: { ...(currentState.status || {}), [etapaKey]: nextStatus },
    details: {
      ...(currentState.details || {}),
      [etapaKey]: {
        ...prevDetails,
        statusNotesLog,
        statusNote: trimmed,
        statusNoteAt: logEntry.at,
      },
    },
  }

  if (nextStatus === STATUS_ETAPA.ACCEPTAT) {
    const nextIndex = etapaIndex + 1
    if (nextIndex < ETAPE_RECRUTARE.length) {
      const nextKey = ETAPE_RECRUTARE[nextIndex].key
      const nextUnlocked = Math.max(unlockedUpTo, nextIndex)
      const prevNextStatus = nextState.status?.[nextKey]
      nextState = {
        ...nextState,
        unlockedUpTo: nextUnlocked,
        status: {
          ...nextState.status,
          [nextKey]: prevNextStatus === STATUS_ETAPA.NEUTRU ? STATUS_ETAPA.IN_ASTEPTARE : prevNextStatus,
        },
      }
    }
  } else if (nextStatus === STATUS_ETAPA.RESPINS) {
    const lockedStatus = { ...(nextState.status || {}) }
    for (let i = etapaIndex + 1; i < ETAPE_RECRUTARE.length; i += 1) {
      lockedStatus[ETAPE_RECRUTARE[i].key] = STATUS_ETAPA.NEUTRU
    }
    nextState = {
      ...nextState,
      unlockedUpTo: etapaIndex,
      status: lockedStatus,
    }
  } else if (nextStatus === STATUS_ETAPA.IN_ASTEPTARE) {
    const lockedStatus = { ...(nextState.status || {}) }
    lockedStatus[etapaKey] = STATUS_ETAPA.IN_ASTEPTARE
    for (let i = etapaIndex + 1; i < ETAPE_RECRUTARE.length; i += 1) {
      lockedStatus[ETAPE_RECRUTARE[i].key] = STATUS_ETAPA.NEUTRU
    }
    nextState = {
      ...nextState,
      unlockedUpTo: etapaIndex,
      status: lockedStatus,
    }
  }
  // HOLD: doar statusul etapei curente; fără modificare unlocked / etape ulterioare

  return nextState
}

/**
 * Adaugă observații / istoric fără a modifica statusul sau progresul (același status selectat din nou).
 */
export function appendPipelineObservationOnly(currentState, etapaKey, noteRaw) {
  if (!currentState || typeof currentState !== 'object') return null
  const status = currentState.status?.[etapaKey]
  if (status == null) return null

  const prevDetails =
    currentState.details?.[etapaKey] && typeof currentState.details[etapaKey] === 'object'
      ? { ...currentState.details[etapaKey] }
      : {}
  const trimmed = noteRaw != null ? String(noteRaw).trim() : ''
  const noteLine = trimmed || '(fără observații)'
  const logEntry = {
    at: new Date().toISOString(),
    status,
    note: noteLine,
  }
  const prevLog = Array.isArray(prevDetails.statusNotesLog) ? prevDetails.statusNotesLog : []
  const statusNotesLog = [...prevLog, logEntry].slice(-16)

  return {
    ...currentState,
    details: {
      ...(currentState.details || {}),
      [etapaKey]: {
        ...prevDetails,
        statusNotesLog,
        statusNote: trimmed,
        statusNoteAt: logEntry.at,
      },
    },
  }
}

/**
 * Pipeline-uri salvate înainte de etapa „interviu HR”: inserăm etapa și corectăm indexul unlockedUpTo.
 */
function normalizePipelineStateForInterviuHr(state) {
  if (state.status?.interviuHr !== undefined) {
    return state
  }
  const u = Number.isFinite(state.unlockedUpTo) ? state.unlockedUpTo : 0
  const next = {
    ...state,
    status: { ...state.status, interviuHr: STATUS_ETAPA.NEUTRU },
    details: {
      ...state.details,
      interviuHr: {
        scheduledAt: state.details?.interviuHr?.scheduledAt,
        interviewerNotes:
          state.details?.interviuHr?.interviewerNotes ||
          'Notițe interviu HR: potrivire cu rolul, motivație, așteptări, disponibilitate.',
      },
    },
  }
  if (u >= 3) {
    next.unlockedUpTo = u + 1
  }
  return next
}

export function parsePipelineStateJson(json) {
  if (!json || typeof json !== 'string') return null
  try {
    const o = JSON.parse(json)
    if (o && typeof o === 'object' && o.status && typeof o.status === 'object') {
      return normalizePipelineStateForInterviuHr(o)
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * @param {number|string} seedNum
 * @param {{ aiCvReview?: boolean }} [options] — dacă aplicarea a fost trimisă cu Review CV AI activat
 */
export function buildDefaultPipelineState(seedNum, options = {}) {
  const aiFromApply = Boolean(options.aiCvReview)
  const seed = Number(String(seedNum).replaceAll(/[^0-9]/g, '').slice(-6) || 1)
  const zileInUrma = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const formatDataOra = (d) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return {
    // Aliniat cu backend: dacă candidatul a bifat AI la aplicare, reviewAi reflectă fluxul AI
    reviewAi: aiFromApply,
    reviewEnglezaAutomat: true,
    unlockedUpTo: 1,
    details: {
      depusCv: {
        submittedAt: formatDataOra(zileInUrma(-(seed % 12) - 1)),
        source: 'Formular aplicare',
      },
      reviewCv: {
        acceptReasons: [
          'Experiență relevantă pentru rol',
          'CV bine structurat și clar',
          'Proiecte relevante / tehnologii potrivite',
        ],
        rejectReasons: [
          'Lipsă experiență pe tehnologiile cerute',
          'Informații insuficiente în CV',
          'Neconcordanțe în experiență / gap-uri neexplicate',
        ],
        notes: 'Scor general CV: în evaluare.',
      },
      reviewEngleza: {
        acceptReasons: ['Nivel B2+ confirmat', 'Comunicare scrisă bună'],
        rejectReasons: ['Nivel sub minimul cerut'],
        notes: 'Evaluare engleză: automat/manual (în funcție de toggle).',
      },
      interviuHr: {
        scheduledAt: formatDataOra(zileInUrma((seed % 4) + 1)),
        interviewerNotes: 'Notițe HR: screening comportamental și aliniere cu cultura echipei.',
      },
      reviewTehnic: {
        acceptReasons: ['Stack potrivit pentru post', 'Experiență hands-on'],
        rejectReasons: ['Lipsă cunoștințe cheie'],
        notes: 'Observații tehnice: se recomandă interviu tehnic.',
      },
      interviuTehnic: {
        scheduledAt: formatDataOra(zileInUrma((seed % 5) + 1)),
        interviewerNotes: 'Notițe intervievator: întrebări pe proiecte + algoritmi.',
      },
      reviewManagement: {
        acceptReasons: ['Potrivire cu echipa și obiectivele'],
        rejectReasons: ['Așteptări salariale peste buget'],
        notes: 'Management review.',
      },
      interviuManagement: {
        scheduledAt: formatDataOra(zileInUrma((seed % 6) + 3)),
        interviewerNotes: 'Notițe management: motivare și autonomie.',
      },
      oferta: {
        offerStatus: 'Nepregătită încă',
        notes: 'Detalii ofertă după management.',
      },
    },
    status: {
      depusCv: STATUS_ETAPA.ACCEPTAT,
      reviewCv: STATUS_ETAPA.IN_ASTEPTARE,
      reviewEngleza: STATUS_ETAPA.NEUTRU,
      interviuHr: STATUS_ETAPA.NEUTRU,
      reviewTehnic: STATUS_ETAPA.NEUTRU,
      interviuTehnic: STATUS_ETAPA.NEUTRU,
      reviewManagement: STATUS_ETAPA.NEUTRU,
      interviuManagement: STATUS_ETAPA.NEUTRU,
      oferta: STATUS_ETAPA.NEUTRU,
    },
  }
}
