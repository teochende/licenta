import { apiFetch } from './client'

export function listUtilizatori(token) {
  return apiFetch('/api/utilizatori', { token })
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
