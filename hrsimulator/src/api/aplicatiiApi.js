import { apiFetch } from './client'

/** Multipart: postId, numeCandidat, email, file */
export function createAplicatie(formData) {
  return apiFetch('/api/aplicatii', { method: 'POST', body: formData })
}

async function parseErrorJson(res) {
  try {
    const j = await res.json()
    return j.message || JSON.stringify(j)
  } catch {
    return res.statusText
  }
}

/**
 * Descarcă fișierul CV (autentificat). PDF/TXT: deschidere în tab nou; DOC/DOCX: descărcare.
 */
export async function fetchAplicatieCv(token, aplicatieId) {
  const res = await fetch(`/api/aplicatii/${aplicatieId}/cv-fisier`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new Error(await parseErrorJson(res))
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;\s]+)/i)
  let filename = 'cv'
  if (m) {
    filename = decodeURIComponent((m[1] || m[2] || m[3] || 'cv').replace(/"/g, ''))
  }
  return { blob, contentType: res.headers.get('content-type') || '', filename }
}

export function openCvFromBlob(cvNumeFisier, blob, filename) {
  const name = (cvNumeFisier || filename || '').toLowerCase()
  const isWord = name.endsWith('.docx') || name.endsWith('.doc')
  const url = URL.createObjectURL(blob)
  if (isWord) {
    const a = document.createElement('a')
    a.href = url
    a.download = cvNumeFisier || filename || 'cv.docx'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return 'download'
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
  return 'open'
}

function appendDashboardQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  if (params.q != null && String(params.q).trim() !== '') qs.set('q', String(params.q).trim())
  if (params.postId != null && params.postId !== '') qs.set('postId', String(params.postId))
  if (params.listaStatus != null && String(params.listaStatus).trim() !== '') {
    qs.set('listaStatus', String(params.listaStatus).trim())
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Fără `page`/`size` → lista completă; cu paginare → `{ content, totalElements, page, size, totalPages }`. */
export function getAplicatiiDashboard(token, params) {
  return apiFetch(`/api/aplicatii/dashboard${appendDashboardQuery(params)}`, { token })
}

export function patchAplicatiePipeline(token, aplicatieId, pipelineStateJson) {
  return apiFetch(`/api/aplicatii/${aplicatieId}/pipeline`, {
    method: 'PATCH',
    token,
    body: { pipelineStateJson },
  })
}

/** Recrutor / admin / MR: marchează dacă intervievatorii tehnici văd aplicarea în dashboard. */
export function patchAplicatieVizibilitateIntervievatoriTehnic(token, aplicatieId, vizibilIntervievatoriTehnic) {
  return apiFetch(`/api/aplicatii/${aplicatieId}/vizibilitate-intervievatori-tehnici`, {
    method: 'PATCH',
    token,
    body: { vizibilIntervievatoriTehnic },
  })
}

export function recalcAplicatiiMatchScore(token, { onlyMissing = true } = {}) {
  const qs = `onlyMissing=${onlyMissing ? 'true' : 'false'}`
  return apiFetch(`/api/admin/aplicatii/recalc-match-score?${qs}`, {
    method: 'POST',
    token,
  })
}

export function recalcAplicatieMatchScore(token, aplicatieId, { force = false } = {}) {
  const qs = `force=${force ? 'true' : 'false'}`
  return apiFetch(`/api/admin/aplicatii/${aplicatieId}/recalc-match-score?${qs}`, {
    method: 'POST',
    token,
  })
}
