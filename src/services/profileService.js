/** Appels du profil authentifié et de sa photo. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const getProfile = () => apiFetch(API_ENDPOINTS.auth.profile)
export const updateProfile = (payload) => apiFetch(API_ENDPOINTS.auth.profile, { method: 'PATCH', body: payload })
export const updateProfilePhoto = (file) => {
  const formData = new FormData()
  formData.append('photo', file)
  return apiFetch(API_ENDPOINTS.auth.profilePhoto, { method: 'POST', body: formData })
}
