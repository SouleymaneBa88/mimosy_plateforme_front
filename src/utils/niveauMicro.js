/**
 * Mesure en direct du signal d'un micro (Web Audio : AudioContext + AnalyserNode).
 *
 * suivreNiveauMicro(flux, onMesure) appelle onMesure({ niveau, bandes }) environ
 * 30 fois par seconde :
 *   niveau : intensité RMS de la voix, ramenée entre 0 et 1 ;
 *   bandes : NB_BANDES valeurs entre 0 et 1 (spectre de la voix), pour l'onde.
 * Sans parole, les valeurs restent proches de 0 : la visualisation ne bouge pas
 * toute seule. Renvoie la fonction d'arrêt, qui libère l'AudioContext (le flux
 * lui-même reste la propriété de l'appelant).
 */

export const NB_BANDES = 24
// Au-dessus de ce niveau (0..1), on considère que la personne parle.
export const SEUIL_PAROLE = 0.08
const INTERVALLE_MS = 33
// Amplification : la voix au micro dépasse rarement 0,3 en RMS brut.
const GAIN_NIVEAU = 3.2

export function suivreNiveauMicro(flux, onMesure, {
  Contexte = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null,
  planifier = (fn) => setTimeout(fn, INTERVALLE_MS),
  annulerPlanification = (id) => clearTimeout(id),
} = {}) {
  if (!Contexte || !flux?.getAudioTracks?.().length) return () => {}
  let contexte
  try {
    contexte = new Contexte()
  } catch {
    return () => {}
  }
  const source = contexte.createMediaStreamSource(flux)
  const analyseur = contexte.createAnalyser()
  analyseur.fftSize = 512
  analyseur.smoothingTimeConstant = 0.6
  source.connect(analyseur)
  const temporel = new Float32Array(analyseur.fftSize)
  const frequences = new Uint8Array(analyseur.frequencyBinCount)
  // La voix humaine occupe surtout le bas du spectre : on n'affiche que cette partie.
  const utiles = Math.max(NB_BANDES, Math.floor(frequences.length * 0.45))
  let arrete = false
  let minuteur = null

  const mesurer = () => {
    if (arrete) return
    analyseur.getFloatTimeDomainData(temporel)
    let somme = 0
    for (const e of temporel) somme += e * e
    const niveau = Math.min(1, Math.sqrt(somme / temporel.length) * GAIN_NIVEAU)
    analyseur.getByteFrequencyData(frequences)
    const parBande = utiles / NB_BANDES
    const bandes = Array.from({ length: NB_BANDES }, (_, i) => {
      let max = 0
      for (let j = Math.floor(i * parBande); j < Math.floor((i + 1) * parBande); j += 1) max = Math.max(max, frequences[j])
      return max / 255
    })
    onMesure({ niveau, bandes })
    minuteur = planifier(mesurer)
  }
  // Certains navigateurs créent l'AudioContext suspendu tant qu'il n'y a pas eu de geste.
  contexte.resume?.().catch?.(() => {})
  mesurer()

  return () => {
    if (arrete) return
    arrete = true
    annulerPlanification(minuteur)
    try {
      source.disconnect()
    } catch {
      /* déjà déconnecté */
    }
    contexte.close?.().catch?.(() => {})
  }
}
