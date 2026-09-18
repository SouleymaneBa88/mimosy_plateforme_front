/**
 * Règles de navigation dérivées des rôles renvoyés par l'API Django.
 * Les entrées correspondent uniquement aux routes déclarées dans le router.
 */
import { navigationByRole } from './navigation'

export const ROLE_HOME = {
  CLIENT: 'client-home',
  PRESTATAIRE: 'prestataire-dashboard',
}

export function normalizeRole(role) {
  return String(role || '').toUpperCase()
}

export function getNavigationByRole(role) {
  return navigationByRole[normalizeRole(role)] || []
}

export function getHomeRouteName(role) {
  return ROLE_HOME[normalizeRole(role)] || 'landing'
}

export function canAccessRoute(route, role) {
  const allowedRoles = route.meta?.roles
  return !allowedRoles || allowedRoles.includes(normalizeRole(role))
}
