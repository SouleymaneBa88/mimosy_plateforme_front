/** Parcours réel des demandes et réponses de devis exposées par Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Liste des demandes de devis (celles du client ou celles reçues par le prestataire).
export const listQuoteRequests = () => apiFetch(API_ENDPOINTS.quoteRequests)
// Le client crée une demande de devis.
export const createQuoteRequest = (payload) =>
  apiFetch(API_ENDPOINTS.quoteRequests, { method: 'POST', body: payload })

// Liste des réponses de devis (les propositions de prix des prestataires).
export const listQuoteResponses = () => apiFetch(API_ENDPOINTS.quoteResponses)
// Le prestataire envoie sa proposition de prix.
export const createQuoteResponse = (payload) =>
  apiFetch(API_ENDPOINTS.quoteResponses, { method: 'POST', body: payload })

// Le client accepte une proposition.
export const acceptQuoteResponse = (id) =>
  apiFetch(API_ENDPOINTS.acceptQuoteResponse(id), { method: 'POST' })
// Le client refuse une proposition.
export const refuseQuoteResponse = (id) =>
  apiFetch(API_ENDPOINTS.refuseQuoteResponse(id), { method: 'POST' })
