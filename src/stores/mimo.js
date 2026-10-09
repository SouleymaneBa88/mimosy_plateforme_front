// Store Pinia de Mimo, l'assistant IA client : la conversation en cours, son
// conversation, pré-diagnostic, médias envoyés,
// la liste des prestataires et le profil (pré-remplissage de la demande).
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { converserAvecMimo } from '@/services/diagnosisService'
import { retirerPieceJointe } from '@/services/demandePrestationService'

// La conversation survit à un rechargement de page (même onglet seulement).
const CLE_STOCKAGE = 'mimosy_mimo'

function lireStockage() {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_STOCKAGE) || 'null')
  } catch {
    return null
  }
}

/**
 * Message d'erreur compréhensible : ce qui s'est passé et quoi faire. Le
 * message métier du serveur (format refusé, taille...) est gardé tel quel ;
 * une panne technique (500, réseau) n'expose jamais de détail interne.
 */
export function messageErreurEnvoi(error, avecMedia = false) {
  const statut = error?.status
  // fetch() rejette par une TypeError quand le serveur est injoignable (réseau coupé).
  if (!statut && error instanceof TypeError) {
    return 'Connexion impossible avec MIMOSY. Vérifiez votre connexion Internet, puis renvoyez votre message.'
  }
  if (statut === 401) return 'Votre session a expiré. Reconnectez-vous pour continuer avec Mimo.'
  if (statut === 413) return 'Ce fichier est trop volumineux pour être envoyé. Choisissez un fichier plus léger.'
  if (statut === 429) return 'Vous avez envoyé beaucoup de messages en peu de temps. Patientez une minute, puis réessayez.'
  if (statut >= 500 && !error?.data) {
    return avecMedia
      ? 'Mimo n’a pas pu traiter votre média à cause d’un problème technique. Il est toujours prêt à être renvoyé : réessayez dans un instant.'
      : 'Mimo a rencontré un problème technique. Votre message n’a pas été perdu : réessayez dans un instant.'
  }
  return error?.message || 'Votre message n’a pas pu être envoyé. Réessayez.'
}

// Ce qui est gardé d'un média dans le stockage de l'onglet (jamais le blob local).
function mediaPourStockage(media) {
  if (!media) return null
  const { apercu, ...reste } = media
  return reste
}

export const useMimoStore = defineStore('mimo', () => {
  const sauvegarde = lireStockage()
  // Tours affichés :
  //   client : { role, texte, date, media?: { type: 'image'|'video', nom, apercu?, url?, mediaId?, analyse } }
  //   mimo   : { role, texte, date, langue, etape, messageId, observation }
  const messages = ref(sauvegarde?.messages || [])
  const sessionId = ref(sauvegarde?.sessionId || null)
  const langueCommunication = ref(sauvegarde?.langueCommunication || 'fr')
  // Dernière réponse complète du serveur (étape, pré-diagnostic, recherche...).
  const resultat = ref(sauvegarde?.resultat || null)
  // Photos envoyées dans cette conversation : { id, nom, url }.
  const pieces = ref(sauvegarde?.pieces || [])
  const isLoading = ref(false)
  const errorMessage = ref('')

  function sauvegarder() {
    try {
      sessionStorage.setItem(
        CLE_STOCKAGE,
        JSON.stringify({
          messages: messages.value.map((tour) => (tour.media ? { ...tour, media: mediaPourStockage(tour.media) } : tour)),
          resultat: resultat.value,
          pieces: pieces.value,
          sessionId: sessionId.value,
          langueCommunication: langueCommunication.value,
        }),
      )
    } catch {
      // Stockage indisponible (navigation privée...) : la conversation reste en mémoire.
    }
  }

  // true quand Mimo a une synthèse exploitable ; le client peut continuer la conversation.
  const termine = computed(() => resultat.value?.etape === 'pre_diagnostic')
  // Un média est en cours d'analyse (le message envoyé avec lui attend la réponse).
  const analyseMediaEnCours = computed(() => messages.value.some((tour) => tour.media?.analyse === 'en_cours'))

  /**
   * Envoie un message (et/ou une photo ou une vidéo) à Mimo. L'historique envoyé
   * est la conversation AVANT ce message : le serveur compte lui-même les questions.
   * Le média apparaît immédiatement dans la conversation (aperçu local).
   */
  async function envoyer(texte, photo = null) {
    const message = (texte || '').trim()
    // La conversation reste ouverte après une première synthèse.
    if ((!message && !photo) || isLoading.value) return null
    const historique = messages.value.map(({ role, texte: t }) => ({ role, texte: t }))
    const tour = {
      role: 'client',
      texte: message,
      date: new Date().toISOString(),
      media: photo
        ? {
            type: photo.type?.startsWith('video/') ? 'video' : 'image',
            nom: photo.name || '',
            apercu: URL.createObjectURL(photo),
            analyse: 'en_cours',
          }
        : null,
    }
    messages.value.push(tour)
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await converserAvecMimo({
        message,
        sessionId: sessionId.value,
        historique,
        piecesJointes: pieces.value.map((piece) => piece.id),
        photo,
      })
      sessionId.value = data.session_id || sessionId.value
      langueCommunication.value = data.langue || langueCommunication.value
      resultat.value = data
      pieces.value = data.pieces_jointes || []
      if (tour.media) {
        // Réactif : on modifie l'objet tel qu'il est dans la liste.
        const envoye = messages.value[messages.value.length - 1].media
        Object.assign(envoye, {
          url: data.media?.url || '',
          mediaId: data.media?.id || '',
          analyse: data.media?.analyse_effectuee ? 'effectuee' : 'echec',
          images_analysees: data.media?.images_analysees || 0,
        })
      }
      messages.value.push({
        role: 'mimo',
        texte: data.message,
        date: new Date().toISOString(),
        observation: data.analyse_media || '',
        langue: data.langue || langueCommunication.value,
        etape: data.etape,
        messageId: data.message_id || null,
      })
      sauvegarder()
      return data
    } catch (error) {
      // Le message n'a pas été pris en compte : il est retiré de la conversation,
      // mais le texte et le média restent dans la zone de saisie pour être renvoyés.
      const retire = messages.value.pop()
      if (retire?.media?.apercu) URL.revokeObjectURL(retire.media.apercu)
      errorMessage.value = messageErreurEnvoi(error, Boolean(photo))
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Ce que la fenêtre « Demander une prestation » reprend du pré-diagnostic.
   * Le client peut tout modifier : rien n'est jamais envoyé sans son action.
   */
  const brouillonDemande = computed(() => {
    if (!termine.value) return null
    const r = resultat.value
    const description = [
      r.resume_besoin,
      r.pre_diagnostic ? `Pré-diagnostic Mimo (à confirmer par le professionnel) : ${r.pre_diagnostic}` : '',
    ].filter(Boolean).join('\n\n')
    return {
      serviceNom: r.service_recommande || '',
      categorieNom: r.domaine || '',
      description,
      pieces: pieces.value,
    }
  })

  // Vide la conversation ; les photos qui ne sont pas dans « garder » sont aussi supprimées côté serveur.
  async function recommencer({ garder = [] } = {}) {
    const aRetirer = pieces.value.filter((piece) => !garder.includes(piece.id))
    await Promise.allSettled(aRetirer.map((piece) => retirerPieceJointe(piece.id)))
    messages.value.forEach((tour) => tour.media?.apercu && URL.revokeObjectURL(tour.media.apercu))
    messages.value = []
    sessionId.value = null
    langueCommunication.value = 'fr'
    resultat.value = null
    pieces.value = []
    errorMessage.value = ''
    try {
      sessionStorage.removeItem(CLE_STOCKAGE)
    } catch {
      // Rien à faire.
    }
  }

  // Après l'envoi de la demande : les photos envoyées appartiennent désormais à
  // la demande ; celles que le client a retirées avant l'envoi sont supprimées.
  function demandeEnvoyee(idsEnvoyes = []) {
    return recommencer({ garder: idsEnvoyes })
  }

  return {
    messages,
    sessionId,
    langueCommunication,
    resultat,
    pieces,
    isLoading,
    errorMessage,
    termine,
    analyseMediaEnCours,
    brouillonDemande,
    envoyer,
    recommencer,
    demandeEnvoyee,
  }
})
