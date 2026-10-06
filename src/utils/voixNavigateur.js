/**
 * Voix de secours du navigateur (SpeechSynthesis) pour Aby et Fassa.
 *
 * Utilisée seulement quand la voix Gemini (WAV) ne peut pas être servie :
 * quota épuisé, réseau, génération en échec. Objectif : un français lent,
 * clair et naturel, quel que soit le moteur du navigateur.
 *
 * - choix de la voix : neuronale/en ligne fr-FR d'abord (ex. « Google
 *   français » sous Chrome, « Microsoft … Online (Natural) » sous Edge), puis
 *   voix du système, puis eSpeak (Firefox sous Linux), en évitant ses
 *   variantes déformées ; jamais une voix codée en dur ;
 * - débit adapté au moteur : à réglage égal, eSpeak parle bien plus vite
 *   que les voix Google (mesuré : 0,9 → 159 mots/min contre 135) ;
 * - texte nettoyé (espaces, URL, sigles, horaires, unités) sans en changer
 *   le sens ;
 * - découpage par phrase (et par virgule pour les phrases très longues :
 *   Chrome coupe les voix en ligne après ~15 s), lu dans UNE file contrôlée :
 *   une phrase, sa fin (onend), puis la suivante ;
 * - une même phrase redemandée pendant sa lecture n'est pas relue ;
 * - interruption propre (le prestataire coupe la parole).
 *
 * Mesures (banc d'essai du 2026-10-04, texte de Fassa, transcription Gemini) :
 *   Chrome  « Google français »       0,9 → 135 mots/min, 5 % d'erreurs de mots
 *   Firefox « French (France)+female2 » 0,75 → 134 mots/min, 12 %
 */

// Débit visé ~130-135 mots/min : compréhension avant rapidité.
const DEBIT_VOIX_NATURELLE = 0.9
const DEBIT_ESPEAK = 0.75
// Au-delà, une phrase est découpée aux virgules (≈ 12 s de parole).
const LONGUEUR_MAX_SEGMENT = 180
// Pause ajoutée entre deux phrases (ms) : Firefox/eSpeak enchaîne sinon sans respirer
// (mesuré : 0,01 s, contre 0,3 s pour Chrome). Rien entre deux morceaux d'une même phrase.
const PAUSE_APRES_PHRASE = 200
const PAUSE_APRES_QUESTION = 350
// Une phrase identique redemandée dans ce délai n'est pas relue (ms).
const DELAI_DOUBLON = 1500

const NEURONALES = /natural|neural|online|premium|enhanced|google/i
const FEMININES = /(amélie|amelie|audrey|aurélie|aurelie|marie|julie|denise|vivienne|eloise|hortense|céline|celine|léa|lea|virginie|sylvie|chantal|charline|ariane|google français|female|femme)/i
// Voix eSpeak (speech-dispatcher, Firefox sous Linux) : « French (France)+female2 ».
const ESPEAK = /espeak|mbrola|^French \((France|Belgium|Switzerland|Canada)\)(\+[\w-]+)?$/i
// Variantes eSpeak mesurées les plus claires, puis celles à éviter (déformées, chuchotées).
const ESPEAK_PREFEREES = ['female2', 'female5', 'female1', '']
const ESPEAK_A_EVITER = /robo|klatt|whisper|croak|demonic|half-life|announcement|grandpa|grandma|fast_test|anxious|kaukovalta|tweaky|universal|mr_serious|storm/i

function langue(voix) {
  return (voix.lang || '').toLowerCase().replace('_', '-')
}

export function estESpeak(voix) {
  return ESPEAK.test(voix.name || '')
}

/**
 * Note une voix : plus elle est haute, plus la voix est naturelle et dans la
 * langue voulue (« bcp47 » : fr-FR par défaut, en-US pour l'anglais).
 */
export function noterVoix(voix, bcp47 = 'fr-FR') {
  const nom = voix.name || ''
  const lang = langue(voix)
  const cible = bcp47.toLowerCase()
  let note = 0
  if (lang === cible) note += 30
  else if (lang.startsWith(cible.split('-')[0])) note += 20
  else return -1000 // pas une voix de cette langue
  if (estESpeak(voix)) {
    const variante = (nom.split('+')[1] || '').toLowerCase()
    const rang = ESPEAK_PREFEREES.indexOf(variante)
    note += rang >= 0 ? 10 - rang : 0
    if (ESPEAK_A_EVITER.test(variante)) note -= 50
    return note - 100 // eSpeak reste le dernier choix parmi les voix françaises
  }
  if (NEURONALES.test(nom)) note += 40
  if (FEMININES.test(nom)) note += 10
  if (voix.localService === false) note += 5 // voix en ligne : généralement plus naturelles
  return note
}

/** Meilleure voix de la langue parmi celles du navigateur (null s'il n'y en a aucune). */
export function choisirVoixNavigateur(voix, bcp47 = 'fr-FR') {
  let meilleure = null
  for (const v of voix) {
    if (noterVoix(v, bcp47) > -1000 && (!meilleure || noterVoix(v, bcp47) > noterVoix(meilleure, bcp47))) meilleure = v
  }
  return meilleure
}

/** Réglages de lecture adaptés au moteur de la voix choisie. */
export function reglagesPour(voix, bcp47 = 'fr-FR') {
  return {
    lang: voix?.lang || bcp47,
    rate: voix && estESpeak(voix) ? DEBIT_ESPEAK : DEBIT_VOIX_NATURELLE,
    pitch: 1,
    volume: 1,
  }
}

// ------------------------------------------------------------------ texte
// Lettres séparées par des espaces (pas de points : ils couperaient la phrase en segments).
const SIGLES = { MIMOSY: 'Mimosy', IA: 'I A', CNI: 'C N I', CAP: 'C A P', BTS: 'B T S', FCFA: 'francs C F A' }
const UNITES = [
  [/m²|m2\b/, 'mètres carrés'],
  [/km\b/, 'kilomètres'],
  [/kg\b/, 'kilos'],
  [/%/, 'pour cent'],
]

/**
 * Texte prêt à être lu : propre, ponctué, sans changer son sens. Les règles
 * d'écriture en toutes lettres (heures, unités, sigles) sont françaises :
 * dans une autre langue, seuls le nettoyage et la ponctuation s'appliquent.
 */
export function nettoyerTexte(texte, bcp47 = 'fr-FR') {
  let t = String(texte ?? '')
  const francais = bcp47.toLowerCase().startsWith('fr')
  t = t.replace(/https?:\/\/\S+/g, francais ? 'le lien indiqué' : ' ')
  t = t.replace(/[*_#`>|~]+/g, ' ')
  t = t.replace(/[«»“”"]/g, '')
  t = t.replace(/\p{Extended_Pictographic}/gu, ' ')
  t = t.replace(/^\s*[-•]\s*/gm, '')
  if (francais) t = reglesFrancaises(t)
  // Paragraphes et retours à la ligne : une pause de fin de phrase.
  t = t.replace(/([^.!?…:;,])\s*\n+\s*/g, '$1. ').replace(/\s*\n+\s*/g, ' ')
  t = t.replace(/\s+([,.;:!?…])/g, '$1').replace(/([,.;:!?])(?=[^\s\d.,!?])/g, '$1 ')
  t = t.replace(/\.{3,}/g, '…').replace(/([!?])[.!?]+/g, '$1').replace(/\.{2}/g, '.').replace(/,{2,}/g, ',')
  t = t.replace(/\s{2,}/g, ' ').trim()
  if (t && !/[.!?…]$/.test(t)) t += '.'
  return t === '.' ? '' : t
}

function reglesFrancaises(t) {
  t = t.replace(/\bn°\s*/gi, 'numéro ')
  t = t.replace(/\betc\./gi, 'et cetera.')
  // Horaires et intervalles : « 8h-18h », « 8 h 30 », « 2018-2020 ».
  t = t.replace(/\b(\d{1,2})\s*h(?:\s*(\d{2}))?\b/g, (_, h, m) => `${Number(h)} heure${Number(h) > 1 ? 's' : ''}${m ? ` ${Number(m)}` : ''}`)
  t = t.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 à $2')
  t = t.replace(/(heures?(?: \d+)?)\s*[-–]\s*(\d)/g, '$1 à $2')
  t = t.replace(/\b(\d{1,3})[  .](\d{3})\b/g, '$1$2')
  for (const [motif, lecture] of UNITES) t = t.replace(new RegExp(`(\\d)\\s*(?:${motif.source})`, 'g'), `$1 ${lecture}`)
  for (const [sigle, lecture] of Object.entries(SIGLES)) t = t.replace(new RegExp(`(?<![\\p{L}.])${sigle}(?![\\p{L}])`, 'gu'), lecture)
  return t
}

/** Découpe en phrases ; une phrase trop longue est coupée aux virgules, jamais au milieu d'un mot. */
export function decouperEnSegments(texte, max = LONGUEUR_MAX_SEGMENT) {
  const phrases = texte.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((p) => p.trim()).filter(Boolean) || []
  const segments = []
  for (const phrase of phrases) {
    if (phrase.length <= max) {
      segments.push(phrase)
      continue
    }
    let courant = ''
    for (const morceau of phrase.split(/(?<=[,;:])\s+/)) {
      if (courant && (courant + ' ' + morceau).length > max) {
        segments.push(courant)
        courant = morceau
      } else courant = courant ? `${courant} ${morceau}` : morceau
    }
    if (courant) segments.push(courant)
  }
  return segments
}

// ------------------------------------------------------------------ lecture
let voixEnAttente = null

/** Liste des voix, en attendant leur chargement (Chrome et Firefox les chargent après la page). */
export function voixDisponibles(synthese = window.speechSynthesis, delaiMax = 3000) {
  const deja = synthese.getVoices()
  if (deja.length) return Promise.resolve(deja)
  if (!voixEnAttente) {
    voixEnAttente = new Promise((resolve) => {
      const debut = Date.now()
      const fini = () => {
        const voix = synthese.getVoices()
        if (voix.length || Date.now() - debut >= delaiMax) {
          synthese.removeEventListener?.('voiceschanged', fini)
          clearInterval(sondage)
          voixEnAttente = null
          resolve(voix)
        }
      }
      synthese.addEventListener?.('voiceschanged', fini)
      // Safari et certains Chrome ne déclenchent pas voiceschanged : on sonde aussi.
      const sondage = setInterval(fini, 250)
    })
  }
  return voixEnAttente
}

/**
 * Lecteur unique (une file contrôlée) au-dessus de speechSynthesis.
 * lire(texte) → promesse résolue à la fin de la lecture (ou à l'interruption).
 */
export function creerLecteurNavigateur({ synthese = typeof window !== 'undefined' ? window.speechSynthesis : null } = {}) {
  let lecture = null // { cle, promesse, arreter }
  let derniere = { cle: '', fin: 0 }

  function arreter() {
    lecture?.arreter()
    lecture = null
    synthese?.cancel()
  }

  // options.lang : langue de la phrase (BCP 47), français par défaut.
  function lire(texte, { lang = 'fr-FR' } = {}) {
    if (!synthese) return Promise.resolve()
    const propre = nettoyerTexte(texte, lang)
    if (!propre) return Promise.resolve()
    const cle = propre.toLowerCase()
    // Doublon : la même phrase est déjà en cours, ou vient d'être dite.
    if (lecture?.cle === cle) return lecture.promesse
    if (derniere.cle === cle && Date.now() - derniere.fin < DELAI_DOUBLON) return Promise.resolve()

    arreter()
    let interrompu = false
    let finir = null
    // Références gardées : Chrome peut sinon libérer un énoncé avant son « onend ».
    const enonces = []

    const promesse = new Promise((resolve) => {
      finir = resolve
      voixDisponibles(synthese).then((liste) => {
        if (interrompu) return
        const voix = choisirVoixNavigateur(liste, lang)
        const reglages = reglagesPour(voix, lang)
        const segments = decouperEnSegments(propre)
        let index = 0
        let garde = null
        const suivant = () => {
          clearTimeout(garde)
          if (interrompu || index >= segments.length) {
            resolve()
            return
          }
          const segment = segments[index++]
          const enonce = new SpeechSynthesisUtterance(segment)
          Object.assign(enonce, reglages)
          if (voix) enonce.voice = voix
          enonces.push(enonce)
          const pause = /\?$/.test(segment) ? PAUSE_APRES_QUESTION : /[.!…]$/.test(segment) ? PAUSE_APRES_PHRASE : 0
          let fini = false
          enonce.onend = enonce.onerror = () => {
            // « interrupted », « canceled »… : on passe aussi à la suite (une seule fois).
            if (fini) return
            fini = true
            clearTimeout(garde)
            if (interrompu || index >= segments.length) suivant()
            else setTimeout(suivant, pause)
          }
          // Garde-fou : certains navigateurs oublient « onend ».
          garde = setTimeout(() => enonce.onend(), 4000 + segment.length * 120)
          if (synthese.paused) synthese.resume()
          synthese.speak(enonce)
        }
        // Chrome ignore parfois un speak() lancé juste après cancel() : petit délai.
        setTimeout(suivant, 60)
      })
    }).finally(() => {
      if (lecture?.promesse === promesse) {
        if (!interrompu) derniere = { cle, fin: Date.now() }
        lecture = null
      }
      enonces.length = 0
    })

    lecture = {
      cle,
      promesse,
      arreter: () => {
        interrompu = true
        finir?.()
      },
    }
    return promesse
  }

  return { lire, arreter }
}
