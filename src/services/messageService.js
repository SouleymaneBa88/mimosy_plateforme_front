import { apiFetch } from '@/services/api'
import { API_ENDPOINTS } from '@/config/api'

export function getMessages() {
  return apiFetch(API_ENDPOINTS.messages)
}

export function createMessage(data) {
  return apiFetch(API_ENDPOINTS.messages, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}