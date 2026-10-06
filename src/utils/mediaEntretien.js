/**
 * Adaptateurs navigateur des assistantes IA (Aby, Fassa) : voix, écoute,
 * caméra/enregistrement.
 *
 * - voix   : voix féminine naturelle générée par le serveur (Gemini, WAV
 *            24 kHz, volume normalisé, mise en cache). Si le serveur ne peut
 *            pas la produire (quota, réseau), CETTE phrase est lue par la
 *            meilleure voix française du navigateur (voix neuronales en
 *            priorité, débit posé, une phrase à la fois) ; le serveur est
 *            de nouveau essayé après une courte pause. Toujours
 *            interruptible (le prestataire peut couper la parole) ;
 * - écoute : « appuyer pour parler ». Transcription en direct par le
 *            navigateur (Chrome, Edge, Safari) ; à défaut, l'audio de la
 *            réponse est envoyé au serveur pour être transcrit ;
 * - langue : la langue de communication (fr, en, wo) vient du serveur avec
 *            ses capacités réelles. Sans dictée du navigateur (wolof), la
 *            réponse est enregistrée puis transcrite par le serveur, et un
 *            silence prolongé termine l'écoute tout seul (pas de clic). Sans
 *            voix de secours dans la langue, la phrase est seulement affichée
 *            (jamais lue par une voix française) ;
 * - enregistrement : caméra + micro via MediaRecorder (WebM, ou MP4 sur Safari).
 *
 * Isolés ici pour que la logique (composables/useEntretien.js) soit testée
 * avec de faux adaptateurs, sans caméra, micro ni réseau.
 */
import * as parcoursService from '@/services/parcoursService'
import { creerLecteurNavigateur } from './voixNavigateur'

// Silence (ms) après lequel une réponse parlée est considérée comme terminée.
const SILENCE_FIN_REPONSE = 3000
// Écoute sans dictée du navigateur : niveau sonore (RMS) au-dessus duquel on parle,
// attente maximale du début de la réponse, et durée maximale d'une réponse (ms).
const SEUIL_PAROLE = 0.02
const ATTENTE_DEBUT_REPONSE = 12_000
const DUREE_MAX_REPONSE = 120_000
// Après un échec de la voix serveur, pause avant de la réessayer (ms) : seulement
// quand le navigateur peut lire la phrase à la place (français, anglais).
const PAUSE_APRES_ECHEC_VOIX = 60_000
// Sans voix de secours dans la langue (wolof) : nouveaux essais de la MÊME
// phrase après ces délais (ms), ou après le Retry-After du serveur s'il est
// plus long, dans la limite de ATTENTE_MAX_REESSAI.
const DELAIS_REESSAI = [1_500, 4_000]
const ATTENTE_MAX_REESSAI = 10_000
export function reconnaissanceDisponible() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function enregistrementDisponible() {
  return (
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== 'undefined'
  )
}

// ------------------------------------------------------------------ voix
// La voix du navigateur (secours) : voir utils/voixNavigateur.js.
export { choisirVoixNavigateur, noterVoix } from './voixNavigateur'

// Une seule file de lecture pour toute la page : Aby et Fassa ne parlent jamais en même temps.
let lecteurPartage = null
function lecteurNavigateur() {
  const synthese = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synthese) return null
  if (lecteurPartage?.synthese !== synthese) lecteurPartage = { synthese, ...creerLecteurNavigateur({ synthese }) }
  return lecteurPartage
}

/**
 * parler({ texte, source }) : « source » désigne la parole dans le dossier
 * (ex. { source: 'entretien', entretien: id, index: 3 }) pour la voix serveur.
 */
/**
 * Surveille le niveau sonore d'un flux micro : appelle « fin » après un
 * silence prolongé qui suit une prise de parole (ou si personne ne parle).
 * Renvoie la fonction qui arrête la surveillance (sans effet sans Web Audio).
 */
export function surveillerSilence(flux, fin, { contexte = null, maintenant = () => Date.now() } = {}) {
  const Contexte = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!flux?.getAudioTracks?.().length || (!contexte && !Contexte)) return () => {}
  const audio = contexte || new Contexte()
  const analyseur = audio.createAnalyser()
  analyseur.fftSize = 2048
  audio.createMediaStreamSource(flux).connect(analyseur)
  const echantillons = new Float32Array(analyseur.fftSize)
  const debut = maintenant()
  let derniereParole = null
  const minuteur = setInterval(() => {
    analyseur.getFloatTimeDomainData(echantillons)
    let somme = 0
    for (const e of echantillons) somme += e * e
    const instant = maintenant()
    if (Math.sqrt(somme / echantillons.length) > SEUIL_PAROLE) derniereParole = instant
    const silence = derniereParole ? instant - derniereParole >= SILENCE_FIN_REPONSE : instant - debut >= ATTENTE_DEBUT_REPONSE
    if (silence || instant - debut >= DUREE_MAX_REPONSE) fin()
  }, 150)
  return () => {
    clearInterval(minuteur)
    if (!contexte) audio.close?.().catch?.(() => {})
  }
}

/**
 * « langue » : fonction qui renvoie la langue de communication du serveur
 * ({ code, bcp47, voix_navigateur, dictee_navigateur }) ou null (français).
 *
 * parler() renvoie le résultat de la phrase :
 *   { statut: 'serveur' }      voix serveur jouée ;
 *   { statut: 'navigateur' }   lue par la voix de secours du navigateur ;
 *   { statut: 'interrompue' }  coupée par taire() (l'utilisateur répond) ;
 *   { statut: 'indisponible', raison } AUCUNE voix n'a pu être jouée :
 *       l'appelant DOIT l'afficher (jamais une conversation muette).
 *
 * Deux cas après un échec de la voix serveur :
 *   - la langue a une voix de secours dans le navigateur (français, anglais) :
 *     la phrase est lue par le navigateur, et le serveur est mis en pause
 *     PAUSE_APRES_ECHEC_VOIX (inchangé) ;
 *   - sinon (wolof) : pas de pause globale. La même phrase est réessayée
 *     (DELAIS_REESSAI, ou le Retry-After du serveur s'il est court), et chaque
 *     phrase suivante interroge de nouveau le serveur. Corrige le silence de
 *     Fassa en wolof : un seul 503 coupait toute voix pendant 60 s, sans
 *     secours ni message (journal du 2026-10-06).
 */
export function creerVoix({
  serveur = true,
  maintenant = () => Date.now(),
  langue = () => null,
  attendre = (ms) => new Promise((ok) => setTimeout(ok, ms)),
  recupererVoix = parcoursService.recupererVoix,
} = {}) {
  const lecteur = lecteurNavigateur()
  let audio = null
  let terminer = null
  // Voix serveur en pause jusqu'à cet instant (après un échec, langues avec secours navigateur).
  let pauseJusqua = serveur ? 0 : Infinity
  // Incrémenté par taire() : une phrase en attente de nouvel essai est abandonnée.
  let generation = 0

  const serveurDisponible = () => maintenant() >= pauseJusqua

  // Joue l'audio du serveur ; résout true (fin ou interruption) ou false (fichier illisible).
  function jouer(url) {
    return new Promise((resolve) => {
      audio = new Audio(url)
      audio.preload = 'auto'
      const lecteurAudio = audio
      let attenteGeste = null
      terminer = (ok = true) => {
        attenteGeste?.()
        URL.revokeObjectURL(url)
        terminer = null
        resolve(ok)
      }
      audio.onended = () => terminer?.(true)
      // Fichier illisible : la phrase est lue par le navigateur.
      audio.onerror = () => terminer?.(false)
      audio.play().catch((erreur) => {
        if (erreur?.name !== 'NotAllowedError') {
          terminer?.(true) // lecture interrompue (le prestataire a coupé la parole)
          return
        }
        // Page ouverte sans clic : le navigateur bloque le son. La phrase
        // est jouée au premier geste du prestataire au lieu d'être perdue.
        const rejouer = () => {
          attenteGeste?.()
          lecteurAudio.play().catch(() => terminer?.(true))
        }
        const evenements = ['pointerdown', 'keydown']
        evenements.forEach((e) => window.addEventListener(e, rejouer, { once: true }))
        attenteGeste = () => {
          evenements.forEach((e) => window.removeEventListener(e, rejouer))
          attenteGeste = null
        }
      })
    })
  }

  // Délai avant le nouvel essai n° « essai » (0, 1...), ou null s'il ne faut pas réessayer.
  function delaiAvantNouvelEssai(erreur, essai) {
    // Phrase refusée (pas dans la langue, introuvable) : réessayer ne changera rien.
    if ([404, 409].includes(erreur?.status) || ['langue', 'langue_non_prise_en_charge'].includes(erreur?.code)) return null
    if (essai >= DELAIS_REESSAI.length) return null
    const conseille = erreur?.retryAfter ? erreur.retryAfter * 1000 : 0
    // Quota long (une heure) : inutile d'attendre, la voix est indisponible pour cette phrase.
    if (conseille > ATTENTE_MAX_REESSAI) return null
    return Math.max(DELAIS_REESSAI[essai], conseille)
  }

  return {
    async parler({ texte, source } = {}) {
      if (!texte) return { statut: 'serveur' }
      this.taire()
      const moi = generation
      const info = langue()
      // Voix de secours du navigateur dans cette langue ? (pas de wolof lu par une voix française)
      const secoursNavigateur = !(info && info.voix_navigateur === false)
      let raison = ''

      if (source && (!secoursNavigateur || serveurDisponible())) {
        for (let essai = 0; ; essai += 1) {
          try {
            const url = await recupererVoix(source)
            if (moi !== generation) {
              URL.revokeObjectURL(url)
              return { statut: 'interrompue' }
            }
            if (await jouer(url)) return { statut: moi === generation ? 'serveur' : 'interrompue' }
            raison = 'audio_illisible'
            break
          } catch (erreur) {
            raison = erreur?.code || (erreur?.status ? `http_${erreur.status}` : 'reseau')
            if (secoursNavigateur) {
              // Voix serveur indisponible (quota, réseau) : pause, puis nouvel essai.
              pauseJusqua = maintenant() + PAUSE_APRES_ECHEC_VOIX
              break
            }
            const delai = delaiAvantNouvelEssai(erreur, essai)
            if (delai === null) break
            await attendre(delai)
            if (moi !== generation) return { statut: 'interrompue' }
          }
        }
      }
      if (moi !== generation) return { statut: 'interrompue' }
      // Secours du navigateur, seulement s'il a une voix dans cette langue.
      if (!secoursNavigateur || !lecteur) return { statut: 'indisponible', raison: raison || 'aucune_voix' }
      await lecteur.lire(texte, { lang: info?.bcp47 || 'fr-FR' })
      return { statut: moi === generation ? 'navigateur' : 'interrompue' }
    },
    // Fait générer la voix à l'avance (le serveur la garde en cache) : quand
    // vient son tour, la phrase est dite sans attendre la synthèse vocale.
    precharger(source) {
      if (!serveurDisponible() || !source) return
      recupererVoix(source)
        .then((url) => URL.revokeObjectURL(url))
        .catch(() => {})
    },
    // Couper la parole : le prestataire commence à répondre.
    taire() {
      generation += 1
      if (audio) {
        audio.pause()
        audio = null
      }
      terminer?.(true)
      lecteur?.arreter()
    },
    get voixServeur() {
      return serveurDisponible()
    },
  }
}

// ------------------------------------------------------------------ écoute
/**
 * Écoute une réponse (appuyer pour parler). onPartiel(texte) reçoit la
 * transcription en direct quand le navigateur sait la faire. Se termine sur
 * arreter(), après un silence, ou à la fin du temps imparti, et renvoie le
 * texte final — transcrit par le serveur si le navigateur n'a rien compris.
 */
export function creerEcoute({ flux = () => null, langue = () => null, onEtape = () => {} } = {}) {
  const Reconnaissance = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  let terminer = null
  // Dernière erreur de transcription ('' si aucune) : distingue « rien
  // entendu » d'une transcription impossible (réseau, service indisponible).
  let erreur = ''

  return {
    disponible: Boolean(Reconnaissance) || enregistrementDisponible(),
    get erreur() {
      return erreur
    },
    ecouter(onPartiel = () => {}) {
      erreur = ''
      return new Promise((resolve) => {
        let final = ''
        let partiel = ''
        let silence = null
        let reconnaissance = null
        let dictaphone = null
        let arreterSurveillance = () => {}
        const morceaux = []
        const info = langue()
        // Dictée du navigateur seulement si elle connaît la langue (pas le wolof).
        const dictee = Reconnaissance && (!info || info.dictee_navigateur !== false)

        // Audio de la réponse, pour une transcription serveur si nécessaire.
        const fluxAudio = flux()
        const pistes = fluxAudio?.getAudioTracks?.() || []
        if (pistes.length && typeof MediaRecorder !== 'undefined') {
          dictaphone = new MediaRecorder(new MediaStream(pistes))
          dictaphone.ondataavailable = (e) => e.data.size && morceaux.push(e.data)
          dictaphone.start(500)
        }

        terminer = async () => {
          clearTimeout(silence)
          arreterSurveillance()
          terminer = null
          try {
            reconnaissance?.stop()
          } catch {
            /* déjà arrêtée */
          }
          let texte = `${final} ${partiel}`.trim()
          if (dictaphone && dictaphone.state !== 'inactive') {
            await new Promise((ok) => {
              dictaphone.onstop = ok
              dictaphone.stop()
            })
          }
          if (!texte && morceaux.length) {
            onEtape('transcription')
            try {
              const type = (morceaux[0].type || 'audio/webm').split(';')[0]
              const fichier = new File(morceaux, 'reponse.webm', { type: type.replace('video/', 'audio/') })
              texte = (await parcoursService.transcrireAudio(fichier)).texte || ''
            } catch {
              texte = ''
              erreur = 'La transcription automatique est indisponible. Réessayez, ou écrivez votre réponse.'
            }
          }
          resolve(texte)
        }

        if (!dictee && dictaphone) {
          // Réponse transcrite par le serveur : un silence prolongé la termine.
          arreterSurveillance = surveillerSilence(fluxAudio, () => terminer?.())
        }
        if (dictee) {
          reconnaissance = new Reconnaissance()
          reconnaissance.lang = info?.bcp47 || 'fr-FR'
          reconnaissance.continuous = true
          reconnaissance.interimResults = true
          reconnaissance.onresult = (evenement) => {
            partiel = ''
            for (let i = evenement.resultIndex; i < evenement.results.length; i += 1) {
              const resultat = evenement.results[i]
              if (resultat.isFinal) final = `${final} ${resultat[0].transcript}`.trim()
              else partiel += resultat[0].transcript
            }
            onPartiel(`${final} ${partiel}`.trim())
            clearTimeout(silence)
            silence = setTimeout(() => terminer?.(), SILENCE_FIN_REPONSE)
          }
          reconnaissance.onerror = (evenement) => {
            // « no-speech » et « aborted » ne sont pas des pannes : le serveur peut encore transcrire.
            if (['network', 'service-not-allowed', 'not-allowed'].includes(evenement?.error) && !dictaphone) {
              erreur = 'La reconnaissance vocale est indisponible. Écrivez votre réponse.'
              terminer?.()
            }
          }
          reconnaissance.start()
        }
      })
    },
    arreter() {
      terminer?.()
    },
  }
}

// ------------------------------------------------------------------ enregistrement
function typeEnregistrement() {
  const candidats = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return candidats.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''
}

export function creerEnregistreur() {
  let flux = null
  let enregistreur = null
  let morceaux = []

  return {
    get flux() {
      return flux
    },
    // Ouvre caméra + micro (aperçu possible avant le démarrage).
    async ouvrir() {
      flux = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      return flux
    },
    demarrer() {
      morceaux = []
      const type = typeEnregistrement()
      enregistreur = new MediaRecorder(flux, {
        ...(type ? { mimeType: type } : {}),
        // ~500 kb/s : environ 19 Mo pour 5 minutes (limite serveur : 60 Mo).
        videoBitsPerSecond: 500_000,
      })
      enregistreur.ondataavailable = (e) => e.data.size && morceaux.push(e.data)
      enregistreur.start(1000)
    },
    // Arrête l'enregistrement et renvoie un fichier prêt à être envoyé.
    arreter() {
      return new Promise((resolve) => {
        if (!enregistreur || enregistreur.state === 'inactive') {
          resolve(null)
          return
        }
        enregistreur.onstop = () => {
          const typeBase = (enregistreur.mimeType || 'video/webm').split(';')[0]
          const extension = typeBase.endsWith('mp4') ? 'mp4' : 'webm'
          resolve(new File(morceaux, `entretien.${extension}`, { type: typeBase }))
        }
        enregistreur.stop()
      })
    },
    fermer() {
      flux?.getTracks().forEach((piste) => piste.stop())
      flux = null
    },
  }
}
