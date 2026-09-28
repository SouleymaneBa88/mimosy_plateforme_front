import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from '@/services/api'

/**
 * Localisation déjà enregistrée pour l'utilisateur connecté, ou null
 * s'il n'en a pas encore. L'API renvoie une liste (au plus un élément,
 * la relation étant unique côté backend), pas un objet unique.
 */
export async function getMyLocation() {
  const data = await apiFetch(API_ENDPOINTS.location)
  const liste = Array.isArray(data) ? data : data?.results || []
  return liste[0] || null
}

/**
 * Enregistre une localisation complète : adresse, ville et quartier
 * doivent venir d'une saisie réelle de l'utilisateur, jamais de
 * valeurs inventées pour satisfaire le formulaire.
 */
export function saveLocation({ adresse, ville, quartier, latitude, longitude }) {
  return apiFetch(API_ENDPOINTS.location, {
    method: 'POST',
    body: { adresse, ville, quartier, latitude, longitude },
  })
}

/**
 * Met à jour uniquement les coordonnées GPS d'une localisation déjà
 * enregistrée (son adresse/ville/quartier ne changent pas). Utilisée
 * quand seule la position du navigateur est disponible, sans nouvelle
 * adresse à saisir.
 */
export function updateLocationCoordinates(localisationId, latitude, longitude) {
  return apiFetch(`${API_ENDPOINTS.location}${localisationId}/`, {
    method: 'PATCH',
    body: { latitude, longitude },
  })
}
