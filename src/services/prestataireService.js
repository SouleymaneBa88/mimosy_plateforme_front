/** Appels réservés à l'espace prestataire, alignés sur les routes Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Récupère mon profil de prestataire.
export const getMyProviderProfile = () => apiFetch(API_ENDPOINTS.providerProfile)

// Modifie mon profil de prestataire (PATCH = on envoie seulement les champs modifiés).
export const updateMyProviderProfile = (payload) =>
  apiFetch(API_ENDPOINTS.providerProfile, { method: 'PATCH', body: payload })

// Liste les services que je propose.
// Statistiques agrégées par le serveur (demandes, revenus libérés, avis, rendez-vous).
export const getMonTableauDeBord = (mois = 6) => apiFetch(`${API_ENDPOINTS.monTableauDeBord}?mois=${mois}`)

export const listMyServiceOffers = () => apiFetch(API_ENDPOINTS.providerOffers)

// Ajoute un nouveau service à mon offre.
export const createServiceOffer = (payload) =>
  apiFetch(API_ENDPOINTS.providerOffers, { method: 'POST', body: payload })

// Modifie un de mes services.
export const updateServiceOffer = (id, payload) =>
  apiFetch(`${API_ENDPOINTS.providerOffers}${id}/`, { method: 'PATCH', body: payload })

// Supprime un de mes services.
export const deleteServiceOffer = (id) =>
  apiFetch(`${API_ENDPOINTS.providerOffers}${id}/`, { method: 'DELETE' })
