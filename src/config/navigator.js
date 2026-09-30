/**
 * Règles de navigation dérivées des rôles renvoyés par l'API Django.
 * Les entrées correspondent uniquement aux routes déclarées dans le router.
 */
// Les menus de navigation de chaque rôle.
import { navigationByRole } from './navigationMenus'

// La page d'accueil de chaque rôle après connexion.
export const ROLE_HOME = {
  CLIENT: 'client-home',
  PRESTATAIRE: 'prestataire-dashboard',
  ADMIN: 'admin-dashboard',
}

// Met le rôle en majuscules (ex. "client" -> "CLIENT").
export function normalizeRole(role) {
  return String(role || '').toUpperCase()
}

// Renvoie le menu du rôle (ou une liste vide).
export function getNavigationByRole(role) {
  return navigationByRole[normalizeRole(role)] || []
}

// Renvoie la page d'accueil du rôle (ou la page publique).
export function getHomeRouteName(role) {
  return ROLE_HOME[normalizeRole(role)] || 'landing'
}

// Vérifie si un rôle a le droit d'ouvrir une route.
// Si la route n'a pas de liste de rôles, tout le monde peut y aller.
export function canAccessRoute(route, role) {
  const allowedRoles = route.meta?.roles
  return !allowedRoles || allowedRoles.includes(normalizeRole(role))
}
