async function parseError(res) {
  try {
    const j = await res.json()
    return j.message || JSON.stringify(j)
  } catch {
    return res.statusText
  }
}

/**
 * Fetch către backend (proxy Vite → :8080 în dev).
 */
export async function apiFetch(path, { method = 'GET', token, body, headers = {} } = {}) {
  const h = { ...headers }
  if (body != null && !(body instanceof FormData)) {
    h['Content-Type'] = 'application/json'
  }
  if (token) {
    h['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(path, {
    method,
    headers: h,
    body: body != null && !(body instanceof FormData) ? JSON.stringify(body) : body,
  })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(await parseError(res))
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }
  return res.text()
}
