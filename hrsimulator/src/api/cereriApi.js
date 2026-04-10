import { apiFetch } from './client'

export function createCerere(token, body) {
  return apiFetch('/api/cereri-angajare', { method: 'POST', token, body })
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
