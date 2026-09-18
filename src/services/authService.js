/**
 * Encapsule les appels d'authentification réellement exposés par Django.
 */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch, clearAuthStorage } from './api'

export async function login(credentials) {
  const data = await apiFetch(API_ENDPOINTS.auth.login, {
    method: 'POST',
    body: credentials,
  })
  localStorage.setItem('mimosy_access_token', data.access)
  localStorage.setItem('mimosy_refresh_token', data.refresh)
  localStorage.setItem('mimosy_user', JSON.stringify(data.user))
  return data
}

export function register(payload) {
  return apiFetch(API_ENDPOINTS.auth.register, { method: 'POST', body: payload })
}

export function refresh(refreshToken) {
  return apiFetch(API_ENDPOINTS.auth.refresh, {
    method: 'POST',
    body: { refresh: refreshToken },
  })
}

export async function logout() {
  try {
    await apiFetch(API_ENDPOINTS.auth.logout, { method: 'POST' })
  } finally {
    clearAuthStorage()
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('mimosy_user') || 'null')
  } catch {
    return null
  }
}
