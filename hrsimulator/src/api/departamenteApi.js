import { apiFetch } from './client'

export function getDepartamente(token) {
  return apiFetch('/api/departamente', { token })
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

