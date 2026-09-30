/** Appels à l'API pour les avis laissés sur les prestataires. */
import { apiFetch } from './api'
import { API_ENDPOINTS } from '@/config/api'

// Crée un nouvel avis (note + commentaire).
export async function creerAvis(data) {
  return await apiFetch(API_ENDPOINTS.reviews, {
    method: 'POST',
    body: data,
  })
}

// Récupère la liste des avis visibles pour moi.
export async function listerAvis() {
  return await apiFetch(API_ENDPOINTS.reviews)
}

// Récupère un avis précis grâce à son identifiant.
export async function getAvis(id) {
  return await apiFetch(API_ENDPOINTS.review(id))
}