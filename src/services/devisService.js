/** Parcours réel des demandes et réponses de devis exposées par Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listQuoteRequests = () => apiFetch(API_ENDPOINTS.quoteRequests)
export const createQuoteRequest = (payload) =>
  apiFetch(API_ENDPOINTS.quoteRequests, { method: 'POST', body: payload })

export const listQuoteResponses = () => apiFetch(API_ENDPOINTS.quoteResponses)
export const createQuoteResponse = (payload) =>
  apiFetch(API_ENDPOINTS.quoteResponses, { method: 'POST', body: payload })

export const acceptQuoteResponse = (id) =>
  apiFetch(API_ENDPOINTS.acceptQuoteResponse(id), { method: 'POST' })
