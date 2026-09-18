/** Appels réservés à l'espace prestataire, alignés sur les routes Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const getMyProviderProfile = () => apiFetch(API_ENDPOINTS.providerProfile)

export const updateMyProviderProfile = (payload) =>
  apiFetch(API_ENDPOINTS.providerProfile, { method: 'PATCH', body: payload })

export const listMyServiceOffers = () => apiFetch(API_ENDPOINTS.providerOffers)

export const createServiceOffer = (payload) =>
  apiFetch(API_ENDPOINTS.providerOffers, { method: 'POST', body: payload })

export const updateServiceOffer = (id, payload) =>
  apiFetch(`${API_ENDPOINTS.providerOffers}${id}/`, { method: 'PATCH', body: payload })

export const deleteServiceOffer = (id) =>
  apiFetch(`${API_ENDPOINTS.providerOffers}${id}/`, { method: 'DELETE' })
