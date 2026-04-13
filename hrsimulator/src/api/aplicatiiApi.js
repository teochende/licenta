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

export function getAplicatiiDashboard(token) {
  return apiFetch('/api/aplicatii/dashboard', { token })
}

export function patchAplicatiePipeline(token, aplicatieId, pipelineStateJson) {
  return apiFetch(`/api/aplicatii/${aplicatieId}/pipeline`, {
    method: 'PATCH',
    token,
    body: { pipelineStateJson },
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
