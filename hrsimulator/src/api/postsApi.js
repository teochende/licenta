import { apiFetch } from './client'

function appendDisponibileQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  if (params.q != null && String(params.q).trim() !== '') qs.set('q', String(params.q).trim())
  if (params.domeniu != null && String(params.domeniu).trim() !== '') {
    qs.set('domeniu', String(params.domeniu).trim())
  }
  if (params.subdomeniu != null && String(params.subdomeniu).trim() !== '') {
    qs.set('subdomeniu', String(params.subdomeniu).trim())
  }
  if (params.nivel != null && String(params.nivel).trim() !== '') qs.set('nivel', String(params.nivel).trim())
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function getPosturiDisponibileMeta() {
  return apiFetch('/api/posturi/disponibile/meta')
}

/** Fără `page`/`size` → lista completă; cu paginare → `{ content, totalElements, page, size, totalPages }`. */
export function getPosturiDisponibile(params) {
  return apiFetch(`/api/posturi/disponibile${appendDisponibileQuery(params)}`)
}

function appendPosturiQuery(params) {
  if (!params || typeof params !== 'object') return ''
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  if (params.q != null && String(params.q).trim() !== '') qs.set('q', String(params.q).trim())
  if (params.enabled === true || params.enabled === false) qs.set('enabled', String(params.enabled))
  if (params.finalizate === true || params.finalizate === false) qs.set('finalizate', String(params.finalizate))
  if (params.departamentId != null && params.departamentId !== '') {
    qs.set('departamentId', String(params.departamentId))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Fără `page`/`size` → lista completă (dashboard); cu paginare → `{ content, totalElements, page, size, totalPages }`. */
export function getPosturi(token, params) {
  return apiFetch(`/api/posturi${appendPosturiQuery(params)}`, { token })
}

export function createPost(token, body) {
  return apiFetch('/api/posturi', { method: 'POST', token, body })
}

export function patchPost(token, id, body) {
  return apiFetch(`/api/posturi/${id}`, { method: 'PATCH', token, body })
}

/** Salvează ordinea cardurilor în dashboard pentru un departament (liste complete de ID-uri). */
export function putOrdineDashboard(token, body) {
  return apiFetch('/api/posturi/ordine-dashboard', { method: 'PUT', token, body })
}

export function putIntervievatoriTehnici(token, postId, intervievatoriIds) {
  return apiFetch(`/api/posturi/${postId}/intervievatori-tehnici`, {
    method: 'PUT',
    token,
    body: { intervievatoriIds: intervievatoriIds || [] },
  })
}

export function putAdminAssignari(token, postId, recrutoriIds, intervievatoriIds) {
  return apiFetch(`/api/admin/posturi/${postId}/assignari`, {
    method: 'PUT',
    token,
    body: {
      recrutoriIds: recrutoriIds || [],
      intervievatoriIds: intervievatoriIds || [],
    },
  })
}

export function putPost(token, id, body) {
  return apiFetch(`/api/posturi/${id}`, { method: 'PUT', token, body })
}

export function uploadPostDescriereFisier(token, postId, file) {
  const fd = new FormData()
  fd.append('file', file)
  return apiFetch(`/api/admin/posturi/${postId}/descriere-fisier`, { method: 'POST', token, body: fd })
}

export function deletePostDescriereFisier(token, postId) {
  return apiFetch(`/api/admin/posturi/${postId}/descriere-fisier`, { method: 'DELETE', token })
}

export function deletePost(token, id) {
  return apiFetch(`/api/posturi/${id}`, { method: 'DELETE', token })
}

