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
// L'adresse du serveur et la liste des routes de l'API.
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
// La fonction d'appel à l'API (pour demander le ticket).
import { apiFetch } from './api'

// Délai maximum entre deux tentatives de reconnexion : 30 secondes.
const DELAI_MAX = 30_000

// Variables internes (partagées par tout le fichier) :
// socket       = la connexion WebSocket actuelle ;
// actif        = true si l'on veut rester connecté ;
// tentatives   = nombre d'essais de reconnexion ratés d'affilée ;
// minuteur     = le délai en cours avant la prochaine tentative ;
// dejaConnecte = true après la première connexion réussie ;
// signalerEtat = fonction appelée pour informer du nouvel état.
let socket = null
let actif = false
let tentatives = 0
let minuteur = null
let dejaConnecte = false
let signalerEtat = () => {}

// type d'événement → fonctions à appeler ; '*' reçoit tous les événements.
const ecouteurs = new Map()

// Envoie un événement à toutes les fonctions qui l'écoutent.
function diffuser(evenement) {
  // On prévient les écouteurs de ce type, puis ceux qui écoutent tout ('*').
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

// Programme une nouvelle tentative de connexion après un délai.
function planifierReconnexion() {
  if (!actif) return
  // 1 s, 2 s, 4 s… jusqu'à 30 s : on ne sature pas le serveur s'il est indisponible.
  const delai = Math.min(DELAI_MAX, 1000 * 2 ** tentatives)
  tentatives += 1
  clearTimeout(minuteur)
  minuteur = setTimeout(connecter, delai)
}

// Ouvre la connexion WebSocket (étapes 1 et 2 décrites en haut du fichier).
async function connecter() {
  if (!actif) return
  signalerEtat('connecting')

  // Étape 1 : on demande un ticket au serveur.
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
  // Entre-temps, l'utilisateur s'est peut-être déconnecté.
  if (!actif) return

  // Étape 2 : on transforme http:// en ws:// et on ouvre la connexion avec le ticket.
  const url = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/?ticket=${encodeURIComponent(ticket)}`
  socket = new WebSocket(url)

  // Connexion ouverte : on remet le compteur d'essais à zéro.
  socket.onopen = () => {
    tentatives = 0
    signalerEtat('connected')
    // Si c'est une reconnexion, on prévient les pages qu'elles doivent recharger.
    if (dejaConnecte) diffuser({ type: 'realtime.reconnecte' })
    dejaConnecte = true
  }

  // Un message arrive du serveur.
  socket.onmessage = (message) => {
    let evenement
    // On lit le JSON ; s'il est illisible, on l'ignore.
    try {
      evenement = JSON.parse(message.data)
    } catch {
      return
    }
    // On transmet l'événement aux écouteurs.
    if (evenement?.type) diffuser(evenement)
  }

  // Une erreur réseau : on met l'état à "error".
  socket.onerror = () => signalerEtat('error')

  // La connexion s'est fermée : on retente plus tard (si on veut rester connecté).
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
    // On retire onclose pour ne pas déclencher de reconnexion.
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
  // On crée la liste des écouteurs de ce type si elle n'existe pas encore.
  if (!ecouteurs.has(type)) ecouteurs.set(type, new Set())
  ecouteurs.get(type).add(fonction)
  // On renvoie une fonction qui retire cet écouteur.
  return () => ecouteurs.get(type)?.delete(fonction)
}
