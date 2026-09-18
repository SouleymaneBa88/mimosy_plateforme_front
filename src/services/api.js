/**
 * Client HTTP commun : il ajoute le JWT, respecte FormData et normalise les erreurs.
 */
import { API_BASE_URL } from '@/config/api'

const ACCESS_TOKEN_KEY = 'mimosy_access_token'

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  return response.json()
}

function getErrorMessage(data, fallback) {
  if (data?.detail) return String(data.detail)
  if (data && typeof data === 'object') {
    const message = Object.values(data).flat().find(Boolean)
    if (message) return String(message)
  }
  return fallback
}

async function request(endpoint, options, token) {
  const { headers = {}, body, ...requestOptions } = options
  const requestHeaders = new Headers(headers)

  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: requestHeaders,
    body: body !== undefined && !(body instanceof FormData) && typeof body !== 'string'
      ? JSON.stringify(body)
      : body,
  })

  return { response, data: await parseResponse(response) }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('mimosy_refresh_token')
  if (!refreshToken) return null

  const { response, data } = await request('/api/auth/token/refresh/', {
    method: 'POST',
    body: { refresh: refreshToken },
  })

  if (!response.ok || !data?.access) return null
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
  return data.access
}

export async function apiFetch(endpoint, options = {}) {
  const token = getAccessToken()
  let { response, data } = await request(endpoint, options, token)

  if (response.status === 401 && token && !endpoint.includes('/token/refresh/')) {
    const newToken = await refreshAccessToken()
    if (newToken) ({ response, data } = await request(endpoint, options, newToken))
  }

  if (!response.ok) {
    const error = new Error(getErrorMessage(data, `La requête a échoué (${response.status}).`))
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function clearAuthStorage() {
  localStorage.removeItem('mimosy_access_token')
  localStorage.removeItem('mimosy_refresh_token')
  localStorage.removeItem('mimosy_user')
}
