import { apiFetch } from './client'

export function getDepartamente(token) {
  return apiFetch('/api/departamente', { token })
}
