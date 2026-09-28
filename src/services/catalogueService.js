/** Services du catalogue public et des offres prestataires. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listCategories = () => apiFetch(API_ENDPOINTS.categories)
export const listServices = () => apiFetch(API_ENDPOINTS.services)
export const listServiceOffers = (serviceId) => apiFetch(API_ENDPOINTS.serviceOffers(serviceId))
export const listProviders = () => apiFetch(API_ENDPOINTS.providers)
export const getProvider = (providerId) => apiFetch(API_ENDPOINTS.provider(providerId))

// Gestion admin du catalogue : les mêmes endpoints publics acceptent
// l'écriture pour un compte ADMIN (voir apps.services.permissions.IsAdmin
// côté backend) — pas de doublon d'endpoint, seule la méthode HTTP change.
export const creerCategorie = (donnees) => apiFetch(API_ENDPOINTS.categories, { method: 'POST', body: donnees })
export const modifierCategorie = (id, donnees) => apiFetch(API_ENDPOINTS.category(id), { method: 'PATCH', body: donnees })
export const supprimerCategorie = (id) => apiFetch(API_ENDPOINTS.category(id), { method: 'DELETE' })

export const creerService = (donnees) => apiFetch(API_ENDPOINTS.services, { method: 'POST', body: donnees })
export const modifierService = (id, donnees) => apiFetch(API_ENDPOINTS.service(id), { method: 'PATCH', body: donnees })
export const supprimerService = (id) => apiFetch(API_ENDPOINTS.service(id), { method: 'DELETE' })

/**
 * Recherche combinée d'offres (GET /api/recherche/).
 * Les paramètres vides ne sont pas envoyés, pour ne pas encombrer l'URL
 * ni déclencher de filtre côté backend avec une valeur vide.
 */
export function searchOffers(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([cle, valeur]) => {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      query.set(cle, valeur)
    }
  })

  const queryString = query.toString()
  return apiFetch(`${API_ENDPOINTS.search}${queryString ? `?${queryString}` : ''}`)
}

/**
 * Récupère une page de résultats à partir de l'URL absolue "next"/"previous"
 * renvoyée par la pagination DRF. apiFetch préfixe toujours ses appels avec
 * API_BASE_URL : on ne lui passe donc que le chemin + la requête de cette
 * URL, jamais l'URL absolue telle quelle.
 */
export function fetchSearchPage(url) {
  const cible = new URL(url, window.location.origin)
  return apiFetch(`${cible.pathname}${cible.search}`)
}

/** Recherche en langage naturel : interprète le texte puis délègue à la recherche structurée. */
export function searchIntelligente(query, position = null) {
  const body = { query }
  if (position) {
    body.latitude = position.lat
    body.longitude = position.lng
  }
  return apiFetch(API_ENDPOINTS.searchIntelligente, { method: 'POST', body })
}
