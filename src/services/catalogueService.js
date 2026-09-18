/** Services du catalogue public et des offres prestataires. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listCategories = () => apiFetch(API_ENDPOINTS.categories)
export const listServices = () => apiFetch(API_ENDPOINTS.services)
export const listServiceOffers = (serviceId) => apiFetch(API_ENDPOINTS.serviceOffers(serviceId))
export const listProviders = () => apiFetch(API_ENDPOINTS.providers)
export const getProvider = (providerId) => apiFetch(API_ENDPOINTS.provider(providerId))
