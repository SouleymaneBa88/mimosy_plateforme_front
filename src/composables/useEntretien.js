/**
 * Déroulé de l'entretien professionnel avec Fassa, l'assistante IA de MIMOSY
 * (façon visioconférence).
 *
 *   consentement → caméra/micro → enregistrement → Fassa dit l'accueil
 *   → le compte à rebours démarre → Fassa pose la question (voix féminine)
 *   → le prestataire appuie sur « Répondre à la voix » (il peut couper la
 *     parole à Fassa) ou écrit sa réponse → le backend décide (relance,
 *     question suivante ou fin) → ... → envoi de l'enregistrement.
 *
 * Le BACKEND impose les règles (5 à 7 questions, une relance maximum,
 * 5 minutes, pas de nouvelle question à la toute fin) ; ce composable ajoute
 * un compte à rebours local qui arrête tout à 00:00 même si le réseau est
 * lent. Les dépendances (API, voix, écoute, enregistreur, horloge) sont
 * injectables pour les tests.
 *
 * Langue : celle choisie avec Aby (deps.langue), confirmée par le serveur au
 * démarrage. Fassa parle, écoute et transcrit dans cette langue ; sans dictée
 * du navigateur (wolof), la réponse est transcrite par le serveur (état
 * « transcription ») après un silence, sans clic supplémentaire.
 */
import { computed, onBeforeUnmount, ref } from 'vue'

import * as parcoursService from '@/services/parcoursService'
import { creerEcoute, creerEnregistreur, creerVoix } from '@/utils/mediaEntretien'

export const DUREE_MAX_SECONDES = 300

export function formaterDuree(secondes) {
  const s = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function useEntretien(deps = {}) {
  const service = deps.service || parcoursService
  const enregistreur = deps.enregistreur || creerEnregistreur()
  // Langue de l'entretien : { code, libelle, bcp47, dictee_navigateur, voix_navigateur } ou null (français).
  const langue = ref(deps.langue || null)
  const voix = deps.voix || creerVoix({ langue: () => langue.value })
  const ecoute =
    deps.ecoute ||
    creerEcoute({
      flux: () => enregistreur.flux,
      langue: () => langue.value,
      // Réponse transcrite par le serveur : Fassa « prend note » pendant ce temps.
      onEtape: (e) => {
        if (e === 'transcription' && etat.value === 'ecoute') etat.value = 'transcription'
      },
    })
  const maintenant = deps.maintenant || (() => Date.now())
  const planifier = deps.planifier || ((fn, ms) => setInterval(fn, ms))
  const annuler = deps.annuler || ((id) => clearInterval(id))

  // preparation | en_cours | envoi | termine | erreur
  const phase = ref('preparation')
  // Pendant l'entretien : ia_parle | attente | ecoute | transcription | reflexion
  const etat = ref('attente')
  const entretienId = ref(null)
  const dureeMax = ref(DUREE_MAX_SECONDES)
  const nombreQuestions = ref(6)
  const agent = ref({ nom: 'Fassa', role: 'Assistante IA de vérification professionnelle' })
  const questionNumero = ref(0)
  const texteIA = ref('')
  const transcriptionDirecte = ref('')
  const derniereReponse = ref('')
  // Fil de la transcription : { role: 'ia' | 'prestataire', texte, mode? }.
  const echanges = ref([])
  const secondes = ref(0)
  const chronoDemarre = ref(false)
  const erreur = ref('')
  const consigne = ref('')
  const parcoursFinal = ref(null)
  // Réponse écrite ou transcrite qui n'a pas pu partir (coupure réseau) : à renvoyer.
  const reponseNonEnvoyee = ref('')
  let modeNonEnvoye = 'TEXTE'
  // Dernière phrase de l'IA qu'AUCUNE voix n'a pu dire ({ texte, source, raison }) :
  // affichée (« voix momentanément indisponible ») avec un bouton « Réécouter ».
  const voixIndisponible = ref(null)

  let minuteur = null
  let fini = false
  let interrompu = false

  const tempsRestant = computed(() => Math.max(0, dureeMax.value - secondes.value))
  // Compte à rebours affiché : « 04:32 ».
  const chrono = computed(() => formaterDuree(Math.ceil(tempsRestant.value)))
  const finProche = computed(() => chronoDemarre.value && tempsRestant.value <= 30)
  const iaParle = computed(() => etat.value === 'ia_parle')
  const ecouteEnCours = computed(() => etat.value === 'ecoute')

  // L'IA dit ses segments l'un après l'autre (transition, puis question).
  async function dire(segments) {
    etat.value = 'ia_parle'
    interrompu = false
    for (const segment of segments) {
      if (fini || interrompu) break
      texteIA.value = segment.texte
      echanges.value.push({ role: 'ia', texte: segment.texte })
      const source = { source: 'entretien', entretien: entretienId.value, index: segment.index }
      noterResultatVoix(await voix.parler({ texte: segment.texte, source }), segment.texte, source)
    }
    if (!fini && etat.value === 'ia_parle') etat.value = 'attente'
  }

  // Une phrase non dite est signalée ; une phrase de nouveau entendue efface le signalement.
  function noterResultatVoix(resultat, texte, source) {
    if (resultat?.statut === 'indisponible') voixIndisponible.value = { texte, source, raison: resultat.raison || '' }
    else if (resultat?.statut === 'serveur' || resultat?.statut === 'navigateur') voixIndisponible.value = null
  }

  // « Réécouter » : redemande la voix de la phrase qui n'a pas pu être dite.
  async function reecouter() {
    const phrase = voixIndisponible.value
    if (fini || !phrase || ['ecoute', 'transcription', 'reflexion', 'ia_parle'].includes(etat.value)) return
    etat.value = 'ia_parle'
    noterResultatVoix(await voix.parler({ texte: phrase.texte, source: phrase.source }), phrase.texte, phrase.source)
    if (!fini && etat.value === 'ia_parle') etat.value = 'attente'
  }

  function demarrerChrono() {
    const debut = maintenant()
    chronoDemarre.value = true
    minuteur = planifier(() => {
      secondes.value = Math.min(dureeMax.value, (maintenant() - debut) / 1000)
      // Temps écoulé : l'entretien se termine, même au milieu d'une réponse.
      if (secondes.value >= dureeMax.value) terminer()
    }, 250)
  }

  async function demarrer(consentement) {
    erreur.value = ''
    try {
      const entretien = await service.demarrerEntretien(consentement)
      entretienId.value = entretien.id
      if (entretien.langue) langue.value = entretien.langue
      dureeMax.value = entretien.duree_max_secondes
      nombreQuestions.value = entretien.nombre_questions
      if (entretien.agent) agent.value = entretien.agent
      enregistreur.demarrer()
      phase.value = 'en_cours'
      const [accueil, premiereQuestion] = entretien.segments
      // La 1re question est préparée pendant que l'accueil est dit.
      voix.precharger?.({ source: 'entretien', entretien: entretien.id, index: premiereQuestion.index })
      await dire([accueil])
      // Le temps de l'accueil n'est pas décompté : les 5 minutes commencent ici.
      await service.commencerEntretien(entretien.id)
      if (fini) return
      demarrerChrono()
      questionNumero.value = entretien.question_numero
      await dire([premiereQuestion])
    } catch (e) {
      if (!fini) {
        erreur.value = e.message || "L'entretien n'a pas pu démarrer."
        phase.value = phase.value === 'en_cours' ? 'erreur' : 'preparation'
      }
    }
  }

  // « Répondre à la voix » : coupe la parole à l'IA si besoin, puis écoute.
  async function repondreVoix() {
    if (fini || ['ecoute', 'transcription', 'reflexion'].includes(etat.value)) return
    if (etat.value === 'ia_parle') {
      interrompu = true
      voix.taire()
    }
    consigne.value = ''
    reponseNonEnvoyee.value = ''
    transcriptionDirecte.value = ''
    etat.value = 'ecoute'
    prechargerSuivante()
    const texte = await ecoute.ecouter((partiel) => {
      transcriptionDirecte.value = partiel
    })
    if (fini) return
    if (!texte.trim()) {
      etat.value = 'attente'
      consigne.value =
        ecoute.erreur ||
        "Je n'ai pas entendu de réponse. Appuyez de nouveau sur le micro, ou écrivez votre réponse."
      return
    }
    await envoyerReponse(texte, 'VOIX')
  }

  // « J'ai terminé ma réponse » : arrête l'écoute (la réponse part aussitôt).
  function terminerReponse() {
    ecoute.arreter()
  }

  async function repondreEcrit(texte) {
    if (fini || !texte?.trim() || ['ecoute', 'transcription', 'reflexion'].includes(etat.value)) return
    if (etat.value === 'ia_parle') {
      interrompu = true
      voix.taire()
    }
    consigne.value = ''
    reponseNonEnvoyee.value = ''
    prechargerSuivante()
    await envoyerReponse(texte.trim(), 'TEXTE')
  }

  // Pendant que le prestataire répond, la question suivante est préparée.
  function prechargerSuivante() {
    if (questionNumero.value < nombreQuestions.value) {
      voix.precharger?.({ source: 'question', entretien: entretienId.value, index: questionNumero.value + 1 })
    }
  }

  async function envoyerReponse(texte, mode) {
    etat.value = 'reflexion'
    derniereReponse.value = texte
    echanges.value.push({ role: 'prestataire', texte, mode, envoi: 'en_cours' })
    // Référence réactive (le tableau renvoie un proxy de l'objet ajouté).
    const echange = echanges.value[echanges.value.length - 1]
    try {
      const suite = await service.repondreEntretien(entretienId.value, questionNumero.value, texte, mode)
      echange.envoi = 'ok'
      if (fini) return
      // Le prestataire a demandé une autre langue (« Parle-moi en wolof ») : voix et écoute suivent.
      if (suite.langue) langue.value = suite.langue
      if (suite.action !== 'fin') questionNumero.value = suite.question_numero
      await dire(suite.segments || [{ texte: suite.texte }])
      if (suite.action === 'fin') await terminer()
    } catch (e) {
      if (fini) return
      etat.value = 'attente'
      // La réponse non reçue par le serveur est retirée du fil : le prestataire la renvoie.
      echanges.value = echanges.value.filter((x) => x !== echange)
      derniereReponse.value = ''
      reponseNonEnvoyee.value = texte
      modeNonEnvoye = mode
      consigne.value = e.status
        ? e.message || "Votre réponse n'a pas pu être envoyée. Réessayez."
        : 'Connexion perdue : votre réponse n’a pas été envoyée. Vérifiez votre connexion, puis renvoyez-la.'
    }
  }

  // Après une coupure réseau : renvoie la même réponse, dans son mode d'origine.
  async function renvoyer() {
    const texte = reponseNonEnvoyee.value
    if (fini || !texte || etat.value === 'reflexion' || etat.value === 'ecoute') return
    reponseNonEnvoyee.value = ''
    consigne.value = ''
    await envoyerReponse(texte, modeNonEnvoye)
  }

  async function terminer() {
    if (fini) return
    fini = true
    annuler(minuteur)
    voix.taire()
    ecoute.arreter()
    phase.value = 'envoi'
    try {
      const fichier = await enregistreur.arreter()
      enregistreur.fermer()
      if (!fichier) throw new Error("L'enregistrement de l'entretien est indisponible.")
      const resultat = await service.terminerEntretien(entretienId.value, fichier)
      parcoursFinal.value = resultat.parcours
      phase.value = 'termine'
    } catch (e) {
      erreur.value = e.message || "L'entretien n'a pas pu être envoyé."
      phase.value = 'erreur'
    }
  }

  onBeforeUnmount(() => {
    if (!fini) {
      fini = true
      annuler(minuteur)
      voix.taire()
      ecoute.arreter()
      enregistreur.arreter().finally(() => enregistreur.fermer())
    }
  })

  return {
    phase,
    etat,
    agent,
    langue,
    entretienId,
    dureeMax,
    nombreQuestions,
    questionNumero,
    texteIA,
    iaParle,
    ecouteEnCours,
    transcriptionDirecte,
    derniereReponse,
    echanges,
    secondes,
    chrono,
    tempsRestant,
    finProche,
    chronoDemarre,
    reponseNonEnvoyee,
    voixIndisponible,
    erreur,
    consigne,
    parcoursFinal,
    enregistreur,
    demarrer,
    repondreVoix,
    terminerReponse,
    repondreEcrit,
    renvoyer,
    reecouter,
    terminer,
  }
}
