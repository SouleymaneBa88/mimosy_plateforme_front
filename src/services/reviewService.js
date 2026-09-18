/** Avis exposés par le backend selon le rôle connecté. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listReviews = () => apiFetch(API_ENDPOINTS.reviews)
