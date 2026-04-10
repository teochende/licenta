import { apiFetch } from './client'

export function createAplicatie(body) {
  return apiFetch('/api/aplicatii', { method: 'POST', body })
}

export function getAplicatiiDashboard(token) {
  return apiFetch('/api/aplicatii/dashboard', { token })
}

export function patchAplicatiePipeline(token, aplicatieId, pipelineStateJson) {
  return apiFetch(`/api/aplicatii/${aplicatieId}/pipeline`, {
    method: 'PATCH',
    token,
    body: { pipelineStateJson },
  })
}
