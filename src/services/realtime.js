/**
 * Connexion temps réel (WebSocket) de MIMOSY — une seule par onglet.
 *
 * Le WebSocket ne sert qu'à être PRÉVENU d'un changement ; les détails se
 * rechargent toujours par l'API REST, qui reste la source de vérité.
 *
 *   1. demander un ticket (POST /api/ws/ticket/, avec le JWT habituel)
 *   2. ouvrir ws://…/ws/?ticket=… — le JWT ne passe jamais dans l'URL
 *   3. recevoir des événements {"type": "demande.statut", "id": "42", ...}
 *   4. connexion perdue → nouvelle tentative, avec un NOUVEAU ticket
 *      (un ticket ne sert qu'une fois), après un délai croissant
 *
 * Après une reconnexion, l'événement local « realtime.reconnecte » est émis :
 * des événements ont pu être manqués pendant la coupure (un WebSocket n'est
 * pas une file d'attente), les écrans concernés rechargent donc leurs données.
 */
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

const DELAI_MAX = 30_000

let socket = null
let actif = false
let tentatives = 0
let minuteur = null
let dejaConnecte = false
let signalerEtat = () => {}

// type d'événement → fonctions à appeler ; '*' reçoit tous les événements.
const ecouteurs = new Map()

function diffuser(evenement) {
  for (const cle of [evenement.type, '*']) {
    ecouteurs.get(cle)?.forEach((fonction) => {
      try {
        fonction(evenement)
      } catch (erreur) {
        console.error('Erreur dans un écouteur temps réel :', erreur)
      }
    })
  }
}

function planifierReconnexion() {
  if (!actif) return
  // 1 s, 2 s, 4 s… jusqu'à 30 s : on ne sature pas le serveur s'il est indisponible.
  const delai = Math.min(DELAI_MAX, 1000 * 2 ** tentatives)
  tentatives += 1
  clearTimeout(minuteur)
  minuteur = setTimeout(connecter, delai)
}

async function connecter() {
  if (!actif) return
  signalerEtat('connecting')

  let ticket
  try {
    ;({ ticket } = await apiFetch(API_ENDPOINTS.wsTicket, { method: 'POST' }))
  } catch (erreur) {
    // 401 : session terminée (api.js renvoie déjà vers la connexion) → on s'arrête.
    if (erreur.status === 401) {
      arreter()
      return
    }
    signalerEtat('error')
    planifierReconnexion()
    return
  }
  if (!actif) return

  const url = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/?ticket=${encodeURIComponent(ticket)}`
  socket = new WebSocket(url)

  socket.onopen = () => {
    tentatives = 0
    signalerEtat('connected')
    if (dejaConnecte) diffuser({ type: 'realtime.reconnecte' })
    dejaConnecte = true
  }

  socket.onmessage = (message) => {
    let evenement
    try {
      evenement = JSON.parse(message.data)
    } catch {
      return
    }
    if (evenement?.type) diffuser(evenement)
  }

  socket.onerror = () => signalerEtat('error')

  socket.onclose = () => {
    socket = null
    if (!actif) return
    signalerEtat('disconnected')
    planifierReconnexion()
  }
}

/** Ouvre la connexion (sans effet si elle est déjà active). */
export function demarrer(onEtat = () => {}) {
  signalerEtat = onEtat
  if (actif) return
  actif = true
  tentatives = 0
  connecter()
}

/** Ferme la connexion et annule toute reconnexion (déconnexion de l'utilisateur). */
export function arreter() {
  actif = false
  dejaConnecte = false
  clearTimeout(minuteur)
  if (socket) {
    socket.onclose = null
    socket.close(1000)
    socket = null
  }
  signalerEtat('disconnected')
}

/**
 * Abonne une fonction à un type d'événement ('*' pour tous).
 * Renvoie la fonction de désabonnement.
 */
export function ecouter(type, fonction) {
  if (!ecouteurs.has(type)) ecouteurs.set(type, new Set())
  ecouteurs.get(type).add(fonction)
  return () => ecouteurs.get(type)?.delete(fonction)
}
