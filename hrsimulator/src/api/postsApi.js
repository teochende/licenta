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
