/**
 * Diagnostic client : l'ancien endpoint par règles (/api/diagnostic/) et Mimo,
 * l'assistant IA client (/api/diagnostic/mimo/), qui le réutilise côté backend.
 */
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Envoie la description du problème et reçoit le type de professionnel conseillé.
export const diagnostiquer = (description) =>
  apiFetch(API_ENDPOINTS.diagnostic, { method: 'POST', body: { description } })

/**
 * Un tour de conversation avec Mimo.
 * historique : tours précédents [{ role: 'client' | 'mimo', texte }] ;
 * piecesJointes : identifiants des photos déjà envoyées dans cette conversation ;
 * photo : nouveau fichier image (facultatif) — la requête passe alors en multipart.
 */
export function converserAvecMimo({ message = '', sessionId = null, historique = [], piecesJointes = [], photo = null }) {
  if (!photo) {
    return apiFetch(API_ENDPOINTS.diagnosticMimo, {
      method: 'POST',
      body: { message, session_id: sessionId, historique, pieces_jointes: piecesJointes },
    })
  }
  const formulaire = new FormData()
  formulaire.append('message', message)
  if (sessionId) formulaire.append('session_id', sessionId)
  formulaire.append('historique', JSON.stringify(historique))
  piecesJointes.forEach((id) => formulaire.append('pieces_jointes', id))
  formulaire.append(photo.type?.startsWith('video/') ? 'video' : 'photo', photo)
  return apiFetch(API_ENDPOINTS.diagnosticMimo, { method: 'POST', body: formulaire })
}

/**
 * Voix d'une réponse de Mimo déjà enregistrée. Renvoie une adresse blob à
 * libérer avec URL.revokeObjectURL. En cas d'échec, l'erreur porte status,
 * code (« quota », « langue »...) et retryAfter (secondes), comme
 * parcoursService.recupererVoix : creerVoix décide alors du secours.
 */
export async function recupererVoixMimo(messageId) {
  const token = localStorage.getItem('mimosy_access_token')
  const url = `${API_BASE_URL}${API_ENDPOINTS.diagnosticMimo}voix/${encodeURIComponent(messageId)}/`
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) {
    const error = new Error('Voix de Mimo indisponible.')
    error.status = response.status
    const reessayer = Number(response.headers?.get?.('Retry-After'))
    if (reessayer > 0) error.retryAfter = reessayer
    error.code = (await response.json().catch(() => null))?.code || ''
    throw error
  }
  return URL.createObjectURL(await response.blob())
}

/**
 * Fichier privé d'un média de la conversation (photo ou vidéo), chargé avec le
 * jeton : une balise <img>/<video> ne peut pas envoyer l'en-tête Authorization.
 * « chemin » est l'URL relative renvoyée par le serveur (media.url).
 */
export async function recupererMediaMimo(chemin) {
  const token = localStorage.getItem('mimosy_access_token')
  const response = await fetch(`${API_BASE_URL}${chemin}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) {
    const error = new Error(response.status === 404 ? 'Ce média n’est plus disponible.' : 'Impossible de charger ce média.')
    error.status = response.status
    throw error
  }
  return URL.createObjectURL(await response.blob())
}

export function transcrireAudioMimo(fichier) {
  const formulaire = new FormData()
  formulaire.append('audio', fichier)
  return apiFetch(`${API_ENDPOINTS.diagnosticMimo}transcrire/`, { method: 'POST', body: formulaire })
}

export function confirmerActionMimo(sessionId, actionId) {
  const chemin = `${API_ENDPOINTS.diagnosticMimo}sessions/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionId)}/confirmer/`
  return apiFetch(chemin, { method: 'POST' })
}
