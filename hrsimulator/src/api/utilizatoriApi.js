import { apiFetch } from './client'

function appendUtilizatoriQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  if (params.q != null && String(params.q).trim() !== '') qs.set('q', String(params.q).trim())
  if (params.rol != null && String(params.rol).trim() !== '') qs.set('rol', String(params.rol).trim())
  if (params.departamentId != null && params.departamentId !== '') {
    qs.set('departamentId', String(params.departamentId))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Fără `page`/`size` în params → lista completă; cu `page`+`size` → obiect paginat `{ content, totalElements, page, size, totalPages }`. */
export function listUtilizatori(token, params) {
  return apiFetch(`/api/utilizatori${appendUtilizatoriQuery(params)}`, { token })
}

export function createUtilizator(token, body) {
  return apiFetch('/api/utilizatori', { method: 'POST', token, body })
}

export function patchUtilizator(token, id, body) {
  return apiFetch(`/api/utilizatori/${id}`, { method: 'PATCH', token, body })
}

export function deleteUtilizator(token, id) {
  return apiFetch(`/api/utilizatori/${id}`, { method: 'DELETE', token })
}
