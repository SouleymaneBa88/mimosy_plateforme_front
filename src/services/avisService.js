import { apiFetch } from './api'
import { API_ENDPOINTS } from '@/config/api'

export async function creerAvis(data) {
  return await apiFetch(API_ENDPOINTS.reviews, {
    method: 'POST',
    body: data,
  })
}

export async function listerAvis() {
  return await apiFetch(API_ENDPOINTS.reviews)
}

export async function getAvis(id) {
  return await apiFetch(API_ENDPOINTS.review(id))
}