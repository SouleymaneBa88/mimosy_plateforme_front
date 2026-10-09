/** Services correspondant aux routes DemandePrestation branchées dans Django. */
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Lister, créer, lire et modifier une demande de prestation.
export const listRequests = () => apiFetch(API_ENDPOINTS.requests)
export const createRequest = (payload) => apiFetch(API_ENDPOINTS.requests, { method: 'POST', body: payload })
export const getRequest = (id) => apiFetch(API_ENDPOINTS.request(id))
export const updateRequest = (id, payload) => apiFetch(API_ENDPOINTS.request(id), { method: 'PATCH', body: payload })
// Les actions possibles : annuler (client), accepter / refuser / terminer (prestataire),
// confirmer (client, quand le travail est fait).
export const cancelRequest = (id) => apiFetch(API_ENDPOINTS.cancelRequest(id), { method: 'POST' })
export const acceptRequest = (id) => apiFetch(API_ENDPOINTS.acceptRequest(id), { method: 'POST' })
export const rejectRequest = (id) => apiFetch(API_ENDPOINTS.rejectRequest(id), { method: 'POST' })
export const completeRequest = (id) => apiFetch(API_ENDPOINTS.completeRequest(id), { method: 'POST' })
export const confirmRequest = (id) => apiFetch(API_ENDPOINTS.confirmRequest(id), { method: 'POST' })

// Photo jointe à une demande : servie après contrôle d'accès (client auteur,
// prestataire de la demande, admin), jamais via une URL média publique. Comme
// pour les preuves de litige, il faut un fetch authentifié : l'appelant révoque
// l'URL locale renvoyée (URL.revokeObjectURL) quand il ne l'affiche plus.
export async function recupererApercuPieceJointe(id) {
  const token = localStorage.getItem('mimosy_access_token')
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.pieceJointeDemandeFichier(id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Impossible de charger cette photo.')
  return URL.createObjectURL(await response.blob())
}

// Retire une photo pas encore envoyée avec une demande (client auteur uniquement).
export const retirerPieceJointe = (id) =>
  apiFetch(API_ENDPOINTS.pieceJointeDemandeFichier(id), { method: 'DELETE' })
