/** Services correspondant aux routes Disponibilite/RendezVous branchées dans Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Disponibilités (gestion prestataire).
export const listMesDisponibilites = () => apiFetch(API_ENDPOINTS.disponibilites)
export const createDisponibilite = (payload) =>
  apiFetch(API_ENDPOINTS.disponibilites, { method: 'POST', body: payload })
export const updateDisponibilite = (id, payload) =>
  apiFetch(API_ENDPOINTS.disponibilite(id), { method: 'PATCH', body: payload })
export const deleteDisponibilite = (id) =>
  apiFetch(API_ENDPOINTS.disponibilite(id), { method: 'DELETE' })

// Disponibilités et créneaux (consultation publique, côté client).
export const listDisponibilitesPubliques = (prestataireId) =>
  apiFetch(API_ENDPOINTS.providerDisponibilites(prestataireId))

export const listCreneauxDisponibles = (prestataireId, date) => {
  const query = new URLSearchParams({ date })
  return apiFetch(`${API_ENDPOINTS.providerCreneauxDisponibles(prestataireId)}?${query.toString()}`)
}

// Rendez-vous.
export const listRendezVous = () => apiFetch(API_ENDPOINTS.rendezVous)
export const getRendezVous = (id) => apiFetch(API_ENDPOINTS.rendezVousDetail(id))
export const createRendezVous = (payload) =>
  apiFetch(API_ENDPOINTS.rendezVous, { method: 'POST', body: payload })
export const confirmRendezVous = (id) => apiFetch(API_ENDPOINTS.confirmRendezVous(id), { method: 'POST' })
export const refuseRendezVous = (id) => apiFetch(API_ENDPOINTS.refuseRendezVous(id), { method: 'POST' })
export const cancelRendezVous = (id) => apiFetch(API_ENDPOINTS.cancelRendezVous(id), { method: 'POST' })
export const completeRendezVous = (id) => apiFetch(API_ENDPOINTS.completeRendezVous(id), { method: 'POST' })
