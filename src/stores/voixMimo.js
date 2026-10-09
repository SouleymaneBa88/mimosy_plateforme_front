// Voix de Mimo : UNE seule lecture pour toute l'application.
//
// Plusieurs MimoAssistant peuvent être montés en même temps (page Diagnostic et
// panneau flottant). Chacun lisait la dernière réponse avec son propre lecteur :
// deux lectures se coupaient l'une l'autre. Ce store porte le seul lecteur, et
// une réponse déjà lue n'est jamais relue automatiquement (notamment quand une
// erreur d'envoi fait réapparaître la réponse précédente en dernier).
//
// La lecture réutilise creerVoix (utils/mediaEntretien.js), le gestionnaire déjà
// utilisé par Aby et Fassa : voix serveur, nouvel essai si c'est utile (délai
// Retry-After court), sinon voix du navigateur découpée en phrases, et un statut
// « indisponible » explicite au lieu d'un silence.
import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { creerVoix } from '@/utils/mediaEntretien'
import { recupererVoixMimo } from '@/services/diagnosisService'

const BCP47_PAR_LANGUE = { fr: 'fr-FR', en: 'en-US', wo: 'wo-SN' }

export const useVoixMimoStore = defineStore('voixMimo', () => {
  // 'inactif' | 'preparation' (voix demandée) | 'parle' | 'attente_geste' (son bloqué par le navigateur)
  const phase = ref('inactif')
  // Réponse en cours de lecture (identifiant du message Mimo).
  const messageEnCours = ref(null)
  // Réponses dont la voix n'a pas pu être jouée : messageId → raison.
  const indisponibles = reactive({})
  // Dernière réponse lue automatiquement : jamais relue sans demande du client.
  let dernierLu = null
  let langueCourante = 'fr'

  const voix = creerVoix({
    langue: () => ({
      code: langueCourante,
      bcp47: BCP47_PAR_LANGUE[langueCourante] || 'fr-FR',
      // Pas de wolof lu par une voix française du navigateur.
      voix_navigateur: langueCourante !== 'wo',
    }),
    recupererVoix: (source) => recupererVoixMimo(source.messageId),
    verifierVoixNavigateur: true,
  })

  /**
   * Lit une réponse de Mimo { texte, messageId, langue }. force : relecture
   * demandée par le client (bouton « Réécouter »). Renvoie le statut de creerVoix.
   */
  async function lire(message, { force = false } = {}) {
    if (!message?.texte) return null
    const id = message.messageId || null
    if (!force && id && id === dernierLu) return null
    dernierLu = id
    langueCourante = message.langue || 'fr'
    delete indisponibles[id]
    messageEnCours.value = id
    phase.value = 'preparation'
    const resultat = await voix.parler({
      texte: message.texte,
      source: id ? { messageId: id } : null,
      ignorerPause: force,
      onEtape: (etape) => {
        if (messageEnCours.value !== id) return
        phase.value = etape === 'lecture' ? 'parle' : etape
      },
    })
    if (messageEnCours.value === id) {
      if (resultat?.statut === 'indisponible') indisponibles[id] = resultat.raison || 'indisponible'
      phase.value = 'inactif'
      messageEnCours.value = null
    }
    return resultat
  }

  // Coupe la parole (le client parle, envoie un message ou quitte Mimo).
  function taire() {
    voix.taire()
    phase.value = 'inactif'
    messageEnCours.value = null
  }

  // Nouvelle conversation : la mémoire des lectures repart de zéro.
  function reinitialiser() {
    taire()
    dernierLu = null
    Object.keys(indisponibles).forEach((cle) => delete indisponibles[cle])
  }

  return { phase, messageEnCours, indisponibles, lire, taire, reinitialiser }
})
