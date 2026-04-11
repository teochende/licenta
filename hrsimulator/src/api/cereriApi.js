import { apiFetch } from './client'

async function parseError(res) {
  try {
    const j = await res.json()
    return j.message || JSON.stringify(j)
  } catch {
    return res.statusText
  }
}

/**
 * Creare cerere (multipart): domeniu = departamentId, subdomeniu, descriere MANUAL sau FISIER + fișier opțional.
 * @param {object} fields
 * @param {string} fields.numePost
 * @param {number} fields.nrPozitii
 * @param {number} fields.departamentId
 * @param {string} [fields.subdomeniu]
 * @param {'MANUAL'|'FISIER'} fields.descriereMod
 * @param {string} [fields.descriere] — text obligatoriu dacă MANUAL; note opționale dacă FISIER
 * @param {number[]} [fields.intervievatoriTehniciIds]
 * @param {number[]} [fields.recrutoriIds]
 * @param {File|null} [fields.file]
 */
export function createCerere(token, fields) {
  const fd = new FormData()
  fd.append('numePost', fields.numePost ?? '')
  fd.append('nrPozitii', String(fields.nrPozitii ?? 1))
  fd.append('departamentId', String(fields.departamentId))
  if (fields.subdomeniu != null && String(fields.subdomeniu).trim() !== '') {
    fd.append('subdomeniu', String(fields.subdomeniu).trim())
  }
  fd.append('descriereMod', fields.descriereMod === 'FISIER' ? 'FISIER' : 'MANUAL')
  if (fields.descriere != null && String(fields.descriere).trim() !== '') {
    fd.append('descriere', String(fields.descriere))
  }
  const ids = fields.intervievatoriTehniciIds
  if (Array.isArray(ids) && ids.length > 0) {
    fd.append('intervievatoriTehniciIds', ids.join(','))
  }
  const rids = fields.recrutoriIds
  if (Array.isArray(rids) && rids.length > 0) {
    fd.append('recrutoriIds', rids.join(','))
  }
  if (fields.file instanceof File) {
    fd.append('file', fields.file)
  }
  return apiFetch('/api/cereri-angajare', { method: 'POST', token, body: fd })
}

export function getCerere(token, id) {
  return apiFetch(`/api/cereri-angajare/${id}`, { token })
}

/**
 * Actualizare cerere (pending). Câmpurile {@code null} în body sunt ignorate de backend.
 */
export function updateCerere(token, id, body) {
  return apiFetch(`/api/cereri-angajare/${id}`, { method: 'PUT', token, body })
}

export function getCereriPending(token) {
  return apiFetch('/api/cereri-angajare/pending', { token })
}

export function getCereriMele(token) {
  return apiFetch('/api/cereri-angajare/mele', { token })
}

export function deschidePostDinCerere(token, cerereId, recrutoriIds) {
  return apiFetch(`/api/cereri-angajare/${cerereId}/deschide-post`, {
    method: 'POST',
    token,
    body: { recrutoriIds: recrutoriIds || [] },
  })
}

/**
 * Descarcă fișierul de descriere (pdf/docx) pentru o cerere cu descriereMod=FISIER.
 */
export async function downloadCerereDescriereFisier(token, cerereId, filenameHint) {
  const res = await fetch(`/api/cereri-angajare/${cerereId}/fisier-descriere`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const blob = await res.blob()
  const name = filenameHint || 'descriere.pdf'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(a.href)
}
