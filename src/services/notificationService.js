import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const listNotifications = () => apiFetch(API_ENDPOINTS.notifications)
export const markNotificationRead = (id) =>
  apiFetch(API_ENDPOINTS.readNotification(id), { method: 'POST' })
export const markAllNotificationsRead = () =>
  apiFetch(API_ENDPOINTS.readAllNotifications, { method: 'POST' })
