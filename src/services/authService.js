/**
 * Encapsule les appels d'authentification réellement exposés par Django.
 */
// Les adresses de l'API.
import { API_ENDPOINTS } from '@/config/api'
// La fonction d'appel à l'API et celle qui efface la session.
import { apiFetch, clearAuthStorage } from './api'

// Connexion : envoie email + mot de passe, puis garde les jetons et l'utilisateur.
export async function login(credentials) {
  const data = await apiFetch(API_ENDPOINTS.auth.login, {
    method: 'POST',
    body: credentials,
  })
  // On garde les jetons et les infos de l'utilisateur dans le navigateur.
  localStorage.setItem('mimosy_access_token', data.access)
  localStorage.setItem('mimosy_refresh_token', data.refresh)
  localStorage.setItem('mimosy_user', JSON.stringify(data.user))
  return data
}

// Inscription d'un nouveau compte.
export function register(payload) {
  return apiFetch(API_ENDPOINTS.auth.register, { method: 'POST', body: payload })
}

// Confirme l'adresse e-mail avec le jeton du lien reçu par e-mail.
export function verifyEmail(token) {
  return apiFetch(API_ENDPOINTS.auth.verifyEmail, { method: 'POST', body: { token }, anonyme: true })
}

// Redemande un lien de confirmation d'adresse e-mail.
//  - connecté : le compte est celui du jeton JWT (réponses explicites : 429, 503...) ;
//  - non connecté : l'adresse saisie est envoyée (réponse toujours identique).
export function resendVerificationEmail(email, { connecte = false } = {}) {
  if (connecte) {
    return apiFetch(API_ENDPOINTS.auth.resendVerificationEmail, { method: 'POST', body: {} })
  }
  return apiFetch(API_ENDPOINTS.auth.resendVerificationEmail, { method: 'POST', body: { email }, anonyme: true })
}

// Met à jour l'utilisateur gardé dans le navigateur (ex. après confirmation de l'e-mail).
export function storeUser(user) {
  localStorage.setItem('mimosy_user', JSON.stringify(user))
}

// Demande un nouveau jeton d'accès à partir du jeton de rafraîchissement.
export function refresh(refreshToken) {
  return apiFetch(API_ENDPOINTS.auth.refresh, {
    method: 'POST',
    body: { refresh: refreshToken },
  })
}

// Déconnexion : on prévient le serveur, puis on efface la session locale.
export async function logout() {
  const refreshToken = localStorage.getItem('mimosy_refresh_token')

  try {
    await apiFetch(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      ...(refreshToken ? { body: { refresh: refreshToken } } : {}),
    })
  // "finally" : on efface la session même si l'appel au serveur a échoué.
  } finally {
    clearAuthStorage()
  }
}

// Relit l'utilisateur enregistré dans le navigateur (null si absent ou illisible).
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('mimosy_user') || 'null')
  } catch {
    return null
  }
}
