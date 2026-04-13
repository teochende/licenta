export const ETAPE_RECRUTARE = [
  { key: 'depusCv', label: 'Depus CV' },
  { key: 'reviewCv', label: 'Review CV HR / Review CV AI' },
  { key: 'reviewEngleza', label: 'Review CV engleză' },
  { key: 'interviuHr', label: 'Interviu HR' },
  { key: 'reviewTehnic', label: 'Review CV tehnic' },
  { key: 'interviuTehnic', label: 'Interviu tehnic' },
  { key: 'reviewManagement', label: 'Review CV management' },
  { key: 'interviuManagement', label: 'Interviu management' },
  { key: 'oferta', label: 'Ofertă' },
]

export const STATUS_ETAPA = {
  ACCEPTAT: 'acceptat',
  RESPINS: 'respins',
  IN_ASTEPTARE: 'in_asteptare',
  NEUTRU: 'neutru',
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

export function buildDefaultPipelineState(seedNum) {
  const seed = Number(String(seedNum).replaceAll(/[^0-9]/g, '').slice(-6) || 1)
  const zileInUrma = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const formatDataOra = (d) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return {
    // implicit: review manual; AI doar dacă este activat explicit
    reviewAi: false,
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
