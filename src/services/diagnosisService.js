/** Diagnostic client en langage naturel (voir apps.diagnosis côté backend — pas une IA générative). */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const diagnostiquer = (description) =>
  apiFetch(API_ENDPOINTS.diagnostic, { method: 'POST', body: { description } })
