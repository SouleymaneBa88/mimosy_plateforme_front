/**
 * Client HTTP commun : il ajoute le JWT, respecte FormData et normalise les erreurs.
 */
// L'adresse du serveur Django.
import { API_BASE_URL } from '@/config/api'

// Nom de la clé où l'on garde le jeton d'accès dans le navigateur.
const ACCESS_TOKEN_KEY = 'mimosy_access_token'

// Lit le jeton d'accès enregistré dans le navigateur.
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

// Lit la réponse du serveur et la transforme en objet JavaScript.
async function parseResponse(response) {
  // 204 = "pas de contenu" : rien à lire.
  if (response.status === 204) return null

  // Si la réponse n'est pas du JSON, on ne la lit pas.
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  return response.json()
}

// Trouve un message d'erreur lisible dans la réponse du serveur.
function getErrorMessage(data, fallback) {
  // Django renvoie souvent l'erreur dans "detail".
  if (data?.detail) return String(data.detail)
  // Sinon, on prend le premier message trouvé dans les champs.
  if (data && typeof data === 'object') {
    const message = Object.values(data).flat().find(Boolean)
    if (message) return String(message)
  }
  return fallback
}

// Envoie une requête HTTP au serveur (fonction interne).
async function request(endpoint, options, token) {
  const { headers = {}, body, ...requestOptions } = options
  const requestHeaders = new Headers(headers)

  // On ajoute le jeton JWT dans l'en-tête pour prouver qui on est.
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  // Si on envoie des données (pas un fichier), on précise que c'est du JSON.
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  // On envoie la requête avec fetch.
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: requestHeaders,
    // Les objets sont transformés en texte JSON ; les fichiers (FormData) sont envoyés tels quels.
    body: body !== undefined && !(body instanceof FormData) && typeof body !== 'string'
      ? JSON.stringify(body)
      : body,
  })

  return { response, data: await parseResponse(response) }
}

// Demande un nouveau jeton d'accès quand l'ancien a expiré.
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('mimosy_refresh_token')
  if (!refreshToken) return null

  const { response, data } = await request('/api/auth/token/refresh/', {
    method: 'POST',
    body: { refresh: refreshToken },
  })

  // Échec : pas de nouveau jeton.
  if (!response.ok || !data?.access) return null
  // Succès : on enregistre le nouveau jeton.
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
  return data.access
}

// ------------------------------------------------------------------
// apiFetch : LA fonction utilisée partout dans le frontend pour appeler l'API.
// Exemple : await apiFetch('/api/services/')
// Elle ajoute le jeton, renouvelle le jeton s'il a expiré, et lève
// une erreur lisible si le serveur répond par une erreur.
// ------------------------------------------------------------------
// Option « anonyme: true » : n'envoie pas le jeton (endpoints publics comme la
// confirmation d'e-mail, qui ne doivent pas échouer à cause d'une vieille session).
export async function apiFetch(endpoint, { anonyme = false, ...options } = {}) {
  const token = anonyme ? null : getAccessToken()
  let { response, data } = await request(endpoint, options, token)

  // 401 = "non autorisé" : le jeton a sans doute expiré. On essaie de le renouveler.
  if (response.status === 401 && token && !endpoint.includes('/token/refresh/')) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // On refait la même requête avec le nouveau jeton.
      ({ response, data } = await request(endpoint, options, newToken))
    } else {
      // Le refresh a échoué (jeton expiré ou révoqué) : la session
      // n'est plus valide nulle part ailleurs qu'ici, donc on la
      // nettoie et on renvoie vers la connexion plutôt que de laisser
      // chaque page gérer elle-même un 401 muet.
      clearAuthStorage()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
  }

  // Le serveur a répondu par une erreur : on crée une erreur JavaScript avec le message.
  if (!response.ok) {
    const error = new Error(getErrorMessage(data, `La requête a échoué (${response.status}).`))
    error.status = response.status
    error.data = data
    throw error
  }

  // Tout va bien : on renvoie les données.
  return data
}

// Efface toutes les informations de connexion du navigateur (déconnexion).
export function clearAuthStorage() {
  localStorage.removeItem('mimosy_access_token')
  localStorage.removeItem('mimosy_refresh_token')
  localStorage.removeItem('mimosy_user')
}
