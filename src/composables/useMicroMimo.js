/**
 * Saisie vocale de Mimo : un micro dont l'état est toujours visible.
 *
 * États (etat) :
 *   'inactif'       micro coupé ;
 *   'autorisation'  le navigateur demande l'accès au micro ;
 *   'attente'       micro ouvert, personne ne parle ;
 *   'parole'        la personne parle (signal réel au-dessus du seuil) ;
 *   'transcription' la voix est transcrite par le serveur ;
 *   'envoye'        le texte vient de partir vers Mimo ;
 *   'erreur'        explication dans « erreur ».
 *
 * La voix n'est jamais captée sans action explicite (demarrer() est appelé par
 * un clic). Pistes MediaStream et AudioContext sont libérés à chaque arrêt,
 * sauf si garderFlux() le demande (conversation vocale continue).
 * L'écoute réutilise creerEcoute (utils/mediaEntretien.js) : dictée du
 * navigateur quand elle connaît la langue, sinon transcription serveur.
 */
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { creerEcoute, enregistrementDisponible, reconnaissanceDisponible } from '@/utils/mediaEntretien'
import { NB_BANDES, SEUIL_PAROLE, suivreNiveauMicro } from '@/utils/niveauMicro'

// Après la dernière mesure au-dessus du seuil, on reste « en train de parler » ce temps (ms) :
// évite un clignotement entre deux mots.
const MAINTIEN_PAROLE_MS = 450
const DUREE_ETAT_ENVOYE_MS = 1500

export function messageErreurMicro(erreur) {
  switch (erreur?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'L’accès au micro est refusé. Autorisez le micro pour ce site (icône à gauche de l’adresse), puis réessayez. Vous pouvez aussi écrire votre message.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Aucun micro n’a été détecté. Branchez un micro, ou écrivez votre message.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Le micro est déjà utilisé par une autre application. Fermez-la, puis réessayez.'
    default:
      return 'Le micro n’a pas pu démarrer. Réessayez, ou écrivez votre message.'
  }
}

const zeros = () => Array(NB_BANDES).fill(0)

export function useMicroMimo({
  langue,
  transcrire,
  onTexte,
  silenceFinReponse = 1500,
  garderFlux = () => false,
  maintenant = () => Date.now(),
} = {}) {
  const etat = ref('inactif')
  const erreur = ref('')
  const partiel = ref('')
  const niveau = ref(0)
  const bandes = ref(zeros())
  const flux = shallowRef(null)
  const actif = computed(() => ['autorisation', 'attente', 'parole', 'transcription'].includes(etat.value))
  let ecoute = null
  let arreterMesure = () => {}
  let minuteurEnvoye = null
  let derniereParole = 0

  function stopperMesure() {
    arreterMesure()
    arreterMesure = () => {}
    niveau.value = 0
    bandes.value = zeros()
  }

  function libererFlux() {
    flux.value?.getTracks().forEach((piste) => piste.stop())
    flux.value = null
  }

  function echouer(message) {
    stopperMesure()
    libererFlux()
    etat.value = 'erreur'
    erreur.value = message
  }

  async function demarrer() {
    if (actif.value) return
    clearTimeout(minuteurEnvoye)
    erreur.value = ''
    partiel.value = ''
    const info = langue?.() || {}
    const dictee = reconnaissanceDisponible() && info.dictee_navigateur !== false
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      echouer('Le micro nécessite une connexion sécurisée (https). Écrivez votre message.')
      return
    }
    if (!enregistrementDisponible() && !dictee) {
      echouer(info.code === 'wo'
        ? 'La dictée en wolof a besoin d’un navigateur qui enregistre le micro (Chrome, Edge ou Firefox récents). Vous pouvez écrire votre message.'
        : 'La saisie vocale n’est pas disponible dans ce navigateur. Écrivez votre message.')
      return
    }

    etat.value = 'autorisation'
    if (!flux.value && navigator.mediaDevices?.getUserMedia) {
      try {
        flux.value = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (exception) {
        echouer(messageErreurMicro(exception))
        return
      }
      // Annulé pendant la demande d'autorisation.
      if (etat.value !== 'autorisation') {
        if (!garderFlux()) libererFlux()
        return
      }
    }

    etat.value = 'attente'
    if (flux.value) {
      arreterMesure = suivreNiveauMicro(flux.value, (mesure) => {
        niveau.value = mesure.niveau
        bandes.value = mesure.bandes
        if (etat.value !== 'attente' && etat.value !== 'parole') return
        if (mesure.niveau >= SEUIL_PAROLE) derniereParole = maintenant()
        etat.value = maintenant() - derniereParole <= MAINTIEN_PAROLE_MS ? 'parole' : 'attente'
      })
    }

    ecoute = creerEcoute({
      flux: () => flux.value,
      langue,
      transcrire,
      transcrireToujours: true,
      silenceFinReponse,
      onEtape: (etape) => {
        if (etape !== 'transcription') return
        stopperMesure()
        etat.value = 'transcription'
      },
    })
    const texte = await ecoute.ecouter((p) => {
      partiel.value = p
    })
    const erreurEcoute = ecoute?.erreur || ''
    ecoute = null
    stopperMesure()
    if (!garderFlux()) libererFlux()
    // annuler() a déjà remis le micro au repos : rien n'est envoyé.
    if (etat.value === 'inactif') return

    if (!texte) {
      etat.value = 'erreur'
      erreur.value = erreurEcoute || 'Je n’ai rien entendu. Rapprochez-vous du micro et réessayez, ou écrivez votre message.'
      return
    }
    partiel.value = ''
    etat.value = 'envoye'
    minuteurEnvoye = setTimeout(() => {
      if (etat.value === 'envoye') etat.value = 'inactif'
    }, DUREE_ETAT_ENVOYE_MS)
    await onTexte?.(texte)
  }

  // Fin de la prise de parole : transcription puis envoi.
  function terminer() {
    ecoute?.arreter()
  }

  // Abandon : rien n'est transcrit ni envoyé.
  function annuler() {
    etat.value = 'inactif'
    partiel.value = ''
    stopperMesure()
    ecoute?.annuler()
    if (!garderFlux()) libererFlux()
  }

  function effacerErreur() {
    if (etat.value === 'erreur') etat.value = 'inactif'
    erreur.value = ''
  }

  // Tout libérer (fin du mode vocal, composant démonté).
  function fermer() {
    clearTimeout(minuteurEnvoye)
    annuler()
    libererFlux()
  }

  onBeforeUnmount(fermer)

  return { etat, erreur, partiel, niveau, bandes, flux, actif, demarrer, terminer, annuler, fermer, effacerErreur }
}
