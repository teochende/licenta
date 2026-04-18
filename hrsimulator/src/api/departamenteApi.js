import { apiFetch } from './client'

function appendDepartamenteQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  if (params.q != null && String(params.q).trim() !== '') qs.set('q', String(params.q).trim())
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Fără `page`/`size` → lista completă; cu paginare → `{ content, totalElements, page, size, totalPages }`. */
export function getDepartamente(token, params) {
  return apiFetch(`/api/departamente${appendDepartamenteQuery(params)}`, { token })
}

export function createDepartament(token, body) {
  return apiFetch('/api/departamente', { method: 'POST', token, body })
}

export function updateDepartament(token, id, body) {
  return apiFetch(`/api/departamente/${id}`, { method: 'PUT', token, body })
}

export function deleteDepartament(token, id) {
  return apiFetch(`/api/departamente/${id}`, { method: 'DELETE', token })
}

export function assignDepartamentManager(token, departamentId, utilizatorId) {
  return apiFetch(`/api/departamente/${departamentId}/manager`, {
    method: 'POST',
    token,
    body: { utilizatorId },
  })
}

