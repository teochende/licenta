import { apiFetch } from './client'

export function getRecrutori(token) {
  return apiFetch('/api/hr/recrutori', { token })
}

export function getIntervievatoriTehnici(token) {
  return apiFetch('/api/hr/intervievatori-tehnici', { token })
}
