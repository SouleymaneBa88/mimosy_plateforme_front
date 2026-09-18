/**
 * Configuration unique de l'API Django utilisée par les services frontend.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login/',
    register: '/api/auth/register/',
    refresh: '/api/auth/token/refresh/',
    logout: '/api/auth/logout/',
    profile: '/api/auth/profile/',
    profilePhoto: '/api/auth/profile/photo/',
  },
  location: '/api/location/',
  categories: '/api/categories/',
  services: '/api/services/',
  serviceOffers: (id) => `/api/services/${id}/prestataires/`,
  providerOffers: '/api/prestataire-services/',
  providers: '/api/prestataires/',
  provider: (id) => `/api/prestataires/${id}/`,
  providerProfile: '/api/profil/prestataire/',
  reviews: '/api/avis/',
  review: (id) => `/api/avis/${id}/`,
  requests: '/api/demande-prestation/',
  request: (id) => `/api/demande-prestation/${id}/`,
  cancelRequest: (id) => `/api/demande-prestation/${id}/annuler/`,
  acceptRequest: (id) => `/api/demande-prestation/${id}/accepter/`,
  rejectRequest: (id) => `/api/demande-prestation/${id}/refuser/`,
  completeRequest: (id) => `/api/demande-prestation/${id}/terminer/`,
  quoteRequests: '/api/demandes/',
  quoteResponses: '/api/reponses/',
  acceptQuoteResponse: (id) => `/api/reponses/${id}/accepter/`,
  notifications: '/api/notifications/',
  readNotification: (id) => `/api/notifications/${id}/marquer-lue/`,
  readAllNotifications: '/api/notifications/marquer-toutes-lues/',
}
