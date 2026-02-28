import { tokenStorage } from './tokenStorage.js'

const BASE = '/api'

// Single in-flight refresh promise so concurrent 401s share one refresh request
let pendingRefresh = null

async function apiFetch(path, options = {}, _isRetry = false) {
  const token = tokenStorage.getAccess()
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // Auto-refresh on 401 (skip for the refresh request itself and retries)
  if (res.status === 401 && !_isRetry && path !== '/auth/refresh') {
    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) {
      tokenStorage.clear()
      const err = new Error('Session expired')
      err.status = 401
      throw err
    }

    if (!pendingRefresh) {
      pendingRefresh = apiFetch('/auth/refresh', { method: 'POST', body: { refreshToken } }, true)
        .then((data) => {
          tokenStorage.updateBoth(data.accessToken, data.refreshToken)
          return data.accessToken
        })
        .catch((e) => {
          tokenStorage.clear()
          throw e
        })
        .finally(() => { pendingRefresh = null })
    }

    try {
      await pendingRefresh
    } catch {
      const err = new Error('Session expired')
      err.status = 401
      throw err
    }

    return apiFetch(path, options, true)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.message ?? `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  return data
}

export const api = {
  get:    (path)         => apiFetch(path, { method: 'GET' }),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body }),
  patch:  (path, body)   => apiFetch(path, { method: 'PATCH',  body }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
}
