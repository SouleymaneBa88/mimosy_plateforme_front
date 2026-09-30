/** Appels à l'API pour la messagerie entre client et prestataire. */
import { apiFetch } from '@/services/api'
import { API_ENDPOINTS } from '@/config/api'

// Récupère tous mes messages (envoyés et reçus).
export function getMessages() {
  return apiFetch(API_ENDPOINTS.messages)
}

// Envoie un nouveau message.
export function createMessage(data) {
  return apiFetch(API_ENDPOINTS.messages, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}