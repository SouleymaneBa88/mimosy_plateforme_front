/** Services correspondant aux routes DemandePrestation branchées dans Django. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listRequests = () => apiFetch(API_ENDPOINTS.requests)
export const createRequest = (payload) => apiFetch(API_ENDPOINTS.requests, { method: 'POST', body: payload })
export const getRequest = (id) => apiFetch(API_ENDPOINTS.request(id))
export const updateRequest = (id, payload) => apiFetch(API_ENDPOINTS.request(id), { method: 'PATCH', body: payload })
export const cancelRequest = (id) => apiFetch(API_ENDPOINTS.cancelRequest(id), { method: 'POST' })
export const acceptRequest = (id) => apiFetch(API_ENDPOINTS.acceptRequest(id), { method: 'POST' })
export const rejectRequest = (id) => apiFetch(API_ENDPOINTS.rejectRequest(id), { method: 'POST' })
export const completeRequest = (id) => apiFetch(API_ENDPOINTS.completeRequest(id), { method: 'POST' })
