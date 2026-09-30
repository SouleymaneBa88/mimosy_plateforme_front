/** Appels à l'API pour les notifications de l'utilisateur connecté. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Récupère la liste de mes notifications.
export const listNotifications = () => apiFetch(API_ENDPOINTS.notifications)
// Marque une notification comme lue.
export const markNotificationRead = (id) =>
  apiFetch(API_ENDPOINTS.readNotification(id), { method: 'POST' })
// Marque toutes mes notifications comme lues.
export const markAllNotificationsRead = () =>
  apiFetch(API_ENDPOINTS.readAllNotifications, { method: 'POST' })
