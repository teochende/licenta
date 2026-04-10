import { apiFetch } from './client'

export function loginRequest(email, parola) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, parola },
  })
}

export function meRequest(token) {
  return apiFetch('/auth/me', { token })
}
