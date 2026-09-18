import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from '@/services/api'

export async function saveLocation(latitude, longitude) {
  return await apiFetch(API_ENDPOINTS.location, {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
    }),
  })
}