import { apiFetch } from './client'

export function getPosturiDisponibile() {
  return apiFetch('/api/posturi/disponibile')
}

export function getPosturi(token) {
  return apiFetch('/api/posturi', { token })
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

