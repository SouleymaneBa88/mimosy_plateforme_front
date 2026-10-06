/**
 * Parcours « Vérifier mon profil professionnel » (prestataire).
 * Le backend calcule l'étape courante et applique toutes les règles :
 * ces fonctions ne font que transmettre les actions et lire l'état.
 */
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const getParcours = () => apiFetch(API_ENDPOINTS.parcours)

// Assistant de profil : conversation, question en cours, résumé.
export const getAssistant = () => apiFetch(API_ENDPOINTS.parcoursAssistant)
export const repondreAssistant = (champ, valeur) =>
  apiFetch(API_ENDPOINTS.parcoursAssistant, { method: 'POST', body: { champ, valeur } })
// Change la langue de communication (Aby et Fassa) ; renvoie l'état de l'assistant.
export const definirLangue = (langue) => apiFetch(API_ENDPOINTS.parcoursLangue, { method: 'POST', body: { langue } })

export const calculerCoherence = () => apiFetch(API_ENDPOINTS.parcoursCoherence, { method: 'POST' })
export const soumettreDossier = () => apiFetch(API_ENDPOINTS.parcoursSoumettre, { method: 'POST' })

// Entretien professionnel avec Fassa (IA).
export const demarrerEntretien = (consentement) =>
  apiFetch(API_ENDPOINTS.parcoursEntretien, { method: 'POST', body: { consentement } })
// mode : 'VOIX' (réponse orale transcrite) ou 'TEXTE' (réponse écrite).
export const repondreEntretien = (id, questionNumero, texte, mode = 'TEXTE') =>
  apiFetch(API_ENDPOINTS.parcoursEntretienReponse(id), {
    method: 'POST',
    body: { question_numero: questionNumero, texte, mode },
  })
export const terminerEntretien = (id, enregistrement) => {
  const formData = new FormData()
  formData.append('enregistrement', enregistrement)
  return apiFetch(API_ENDPOINTS.parcoursEntretienTerminer(id), { method: 'POST', body: formData })
}

// Le compte à rebours (5 minutes) démarre quand la première question est prête.
export const commencerEntretien = (id) =>
  apiFetch(API_ENDPOINTS.parcoursEntretienCommencer(id), { method: 'POST' })

/**
 * Voix d'Aby ou de Fassa : fichier audio d'une parole déjà enregistrée dans le
 * dossier (le serveur ne lit jamais un texte arbitraire). Renvoie une adresse
 * locale (blob) à libérer avec URL.revokeObjectURL, ou lève une erreur si la
 * voix serveur est indisponible (le navigateur prend alors le relais).
 */
export async function recupererVoix(params) {
  const token = localStorage.getItem('mimosy_access_token')
  const requete = new URLSearchParams(params).toString()
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.parcoursVoix}?${requete}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const error = new Error('Voix indisponible.')
    error.status = response.status
    // Délai conseillé par le serveur avant un nouvel essai (quota), en secondes.
    const reessayer = Number(response.headers?.get?.('Retry-After'))
    if (reessayer > 0) error.retryAfter = reessayer
    // Nature de l'échec (« quota », « langue », « langue_differente »...), si le serveur la donne.
    error.code = (await response.json().catch(() => null))?.code || ''
    throw error
  }
  return URL.createObjectURL(await response.blob())
}

// Transcription d'une réponse orale par le serveur (navigateurs sans reconnaissance vocale).
export const transcrireAudio = (fichier) => {
  const formData = new FormData()
  formData.append('audio', fichier)
  return apiFetch(API_ENDPOINTS.parcoursTranscrire, { method: 'POST', body: formData })
}
