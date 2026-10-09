<script setup>
/**
 * MimoAssistant.vue — conversation avec Mimo, l'assistant IA client.
 *
 * Conversation multimodale avec Mimo : texte, voix, photo et vidéo partagent
 * une session serveur. Toute la logique métier est côté serveur
 * (apps.diagnosis.mimo, apps.mimo) : ce composant affiche et pilote les médias.
 *
 * Trois états restent distincts à l'écran :
 *   - le micro (useMicroMimo) : écoute, parole détectée, transcription ;
 *   - le traitement (store mimo) : réflexion de Mimo, analyse d'un média ;
 *   - la voix de Mimo (store voixMimo, une seule lecture pour toute l'app).
 *
 * Mimo prépare puis fait confirmer une recherche réelle de prestataires ;
 * il ne crée pas automatiquement une demande de prestation.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Camera, Check, ImageOff, LoaderCircle, Mic, MicOff, RotateCcw, Send, Sparkles, Square, TriangleAlert, Volume2, X,
} from 'lucide-vue-next'

import { confirmerActionMimo, transcrireAudioMimo } from '@/services/diagnosisService'
import { useMimoStore } from '@/stores/mimo'
import { useVoixMimoStore } from '@/stores/voixMimo'
import { useMicroMimo } from '@/composables/useMicroMimo'
import { surveillerBargeIn } from '@/utils/mediaEntretien'
import MimoMedia from '@/components/client/mimo/MimoMedia.vue'
import MimoOndeMicro from '@/components/client/mimo/MimoOndeMicro.vue'
import MimoVisionneuse from '@/components/client/mimo/MimoVisionneuse.vue'

// fermable : Mimo est affiché dans le panneau flottant, qui se ferme depuis cet en-tête.
defineProps({ fermable: { type: Boolean, default: false } })
const emit = defineEmits(['fermer'])

const router = useRouter()
const mimo = useMimoStore()
const voix = useVoixMimoStore()

// Mêmes limites que le serveur (apps.prestations.pieces_jointes, apps.diagnosis.views).
const FORMATS_IMAGE = ['image/jpeg', 'image/png', 'image/webp']
const FORMATS_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024
const TAILLE_MAX_VIDEO = 10 * 1024 * 1024
const BCP47_PAR_LANGUE = { fr: 'fr-FR', en: 'en-US', wo: 'wo-SN' }

const saisie = ref('')
const photoChoisie = ref(null)
const apercuPhoto = ref('')
const erreurPhoto = ref('')
const champPhoto = ref(null)
const fil = ref(null)
const confirmationEnCours = ref(false)
const apercuAgrandi = ref(false)
// Le navigateur ne sait pas lire la vidéo choisie (ex. HEVC d'iPhone) : pas d'aperçu, envoi possible.
const apercuIllisible = ref(false)
// Conversation vocale : après chaque réponse lue, Mimo réécoute automatiquement.
const modeVocalContinu = ref(false)
let arreterBargeIn = () => {}

const micro = useMicroMimo({
  langue: () => ({
    code: mimo.langueCommunication,
    bcp47: BCP47_PAR_LANGUE[mimo.langueCommunication] || 'fr-FR',
    dictee_navigateur: mimo.langueCommunication !== 'wo',
  }),
  transcrire: transcrireAudioMimo,
  silenceFinReponse: 1500,
  garderFlux: () => modeVocalContinu.value,
  onTexte: async (texte) => {
    saisie.value = texte
    await envoyer({ parVoix: true })
  },
})

const resultat = computed(() => mimo.resultat)
const demandePhoto = computed(() => resultat.value?.etape === 'photo')
const microVisible = computed(() => micro.actif.value)
const textesTarifs = computed(() => {
  const textes = {
    fr: { titre: 'Tarifs actuellement publiés', note: 'Le professionnel confirmera le montant exact avant l’intervention.' },
    en: { titre: 'Currently listed prices', note: 'The provider will confirm the exact amount before the service.' },
    wo: { titre: 'Tarif yi ñu bind', note: 'Prestataire bi dina dëggal njëg li mujj.' },
  }
  return textes[mimo.langueCommunication] || textes.fr
})
const peutEnvoyer = computed(() => !mimo.isLoading && Boolean(saisie.value.trim() || photoChoisie.value))
const derniereReponse = computed(() => [...mimo.messages].reverse().find((tour) => tour.role === 'mimo') || null)

// Un seul libellé d'état, du plus urgent au plus calme.
const etatAffiche = computed(() => {
  const etatsMicro = {
    autorisation: 'Autorisation du micro…',
    attente: 'Je vous écoute',
    parole: 'Vous parlez',
    transcription: 'Transcription de votre voix…',
  }
  if (etatsMicro[micro.etat.value]) return { code: `micro-${micro.etat.value}`, texte: etatsMicro[micro.etat.value] }
  if (mimo.isLoading && mimo.analyseMediaEnCours) return { code: 'analyse', texte: 'Analyse du média…' }
  if (mimo.isLoading) return { code: 'reflexion', texte: 'Mimo réfléchit…' }
  if (voix.phase === 'preparation') return { code: 'voix-preparation', texte: 'Mimo prépare sa voix…' }
  if (voix.phase === 'parle') return { code: 'voix-parle', texte: 'Mimo parle' }
  if (voix.phase === 'attente_geste') return { code: 'voix-geste', texte: 'Touchez l’écran pour entendre Mimo' }
  return { code: 'disponible', texte: mimo.termine ? 'Diagnostic prêt' : 'Disponible' }
})
const animationEnCours = computed(() => etatAffiche.value.code !== 'disponible')

const libellesMicro = {
  autorisation: 'Autorisez le micro dans la fenêtre du navigateur…',
  attente: 'Le micro est ouvert. Parlez quand vous voulez.',
  parole: 'Je vous entends.',
  transcription: 'Transcription en cours…',
}

// ------------------------------------------------------------------ voix de Mimo
function lireReponse(tour, force = false) {
  arreterBargeIn()
  return voix.lire(tour, { force })
}

function voixIndisponible(tour) {
  return Boolean(tour.messageId && voix.indisponibles[tour.messageId])
}

function surveillerInterruption() {
  arreterBargeIn()
  if (!modeVocalContinu.value || !micro.flux.value) return
  // Le client parle pendant que Mimo parle : Mimo se tait et écoute.
  arreterBargeIn = surveillerBargeIn(micro.flux.value, () => {
    voix.taire()
    micro.demarrer()
  })
}

// ------------------------------------------------------------------ micro
function basculerMicro() {
  if (micro.actif.value) {
    micro.terminer()
    return
  }
  // La voix de Mimo s'arrête dès que le client veut parler.
  voix.taire()
  micro.effacerErreur()
  modeVocalContinu.value = true
  micro.demarrer()
}

function annulerMicro() {
  micro.annuler()
  modeVocalContinu.value = false
}

function quitterModeVocal() {
  modeVocalContinu.value = false
  arreterBargeIn()
  micro.fermer()
  voix.taire()
}

// ------------------------------------------------------------------ médias
function choisirPhoto() {
  champPhoto.value?.click()
}

function retirerPhoto() {
  if (apercuPhoto.value) URL.revokeObjectURL(apercuPhoto.value)
  photoChoisie.value = null
  apercuPhoto.value = ''
  apercuAgrandi.value = false
  apercuIllisible.value = false
}

function surPhoto(event) {
  const fichier = event.target.files?.[0]
  event.target.value = ''
  erreurPhoto.value = ''
  if (!fichier) return
  const estVideo = FORMATS_VIDEO.includes(fichier.type)
  if (!estVideo && !FORMATS_IMAGE.includes(fichier.type)) {
    erreurPhoto.value = 'Format non pris en charge. Formats acceptés : photos JPEG, PNG ou WebP ; vidéos MP4, WebM ou MOV.'
    return
  }
  if (fichier.size > (estVideo ? TAILLE_MAX_VIDEO : TAILLE_MAX_IMAGE)) {
    erreurPhoto.value = estVideo
      ? 'Cette vidéo dépasse 10 Mo. Filmez un passage plus court (30 secondes suffisent).'
      : 'Cette photo dépasse 5 Mo. Choisissez une photo plus légère.'
    return
  }
  retirerPhoto()
  photoChoisie.value = fichier
  apercuPhoto.value = URL.createObjectURL(fichier)
  if (mimo.termine) envoyer()
}

function formatFcfa(montant) {
  return new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 }).format(Number(montant))
}

function formatFourchette(tarif) {
  const minimum = formatFcfa(tarif.minimum_fcfa)
  const maximum = formatFcfa(tarif.maximum_fcfa)
  return minimum === maximum ? minimum : `${minimum} à ${maximum}`
}

function heure(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' })
}

// ------------------------------------------------------------------ envoi
async function envoyer({ parVoix = false } = {}) {
  if (!peutEnvoyer.value) return
  // Un message tapé au clavier termine la conversation vocale.
  if (!parVoix) {
    if (micro.actif.value) micro.annuler()
    modeVocalContinu.value = false
  }
  voix.taire()
  // Un nouvel envoi efface l'erreur précédente (sinon elle masquerait la nouvelle).
  erreurPhoto.value = ''
  const texte = saisie.value
  const photo = photoChoisie.value
  // L'aperçu local passe dans la conversation : le store crée le sien.
  const reponse = await mimo.envoyer(texte, photo)
  if (reponse) {
    saisie.value = ''
    retirerPhoto()
  }
}

function pasDePhoto() {
  saisie.value = "Je n'ai pas de photo."
  envoyer()
}

function surEntree(event) {
  if (!event.shiftKey) {
    event.preventDefault()
    envoyer()
  }
}

async function voirPrestataires() {
  if (confirmationEnCours.value) return
  const criteres = Object.fromEntries(
    Object.entries(resultat.value?.recherche || {}).filter(([, valeur]) => valeur),
  )
  confirmationEnCours.value = true
  mimo.errorMessage = ''
  try {
    if (resultat.value?.action?.id && mimo.sessionId) {
      await confirmerActionMimo(mimo.sessionId, resultat.value.action.id)
    }
    await router.push({ name: 'client-prestataires', query: { ...criteres, source: 'mimo', mimo: '1' } })
  } catch (error) {
    mimo.errorMessage = error.message
  } finally {
    confirmationEnCours.value = false
  }
}

async function recommencer() {
  retirerPhoto()
  saisie.value = ''
  quitterModeVocal()
  voix.reinitialiser()
  await mimo.recommencer()
}

// ------------------------------------------------------------------ réactions
watch(
  () => [mimo.messages.length, mimo.isLoading, micro.etat.value],
  async () => {
    await nextTick()
    if (fil.value) fil.value.scrollTop = fil.value.scrollHeight
  },
)

// Nouvelle réponse de Mimo : elle est lue une seule fois (store voixMimo).
watch(
  () => derniereReponse.value?.messageId,
  async (id, ancien) => {
    if (!id || id === ancien || !derniereReponse.value?.texte) return
    await lireReponse(derniereReponse.value)
  },
)

watch(() => voix.phase, (phase, precedente) => {
  if (phase === 'parle') surveillerInterruption()
  // Fin de la réponse (lue ou voix indisponible) : en conversation vocale, Mimo réécoute.
  if (phase === 'inactif' && precedente !== 'inactif') {
    arreterBargeIn()
    if (modeVocalContinu.value && !mimo.isLoading && !micro.actif.value && micro.etat.value !== 'erreur') {
      setTimeout(() => {
        if (modeVocalContinu.value && !mimo.isLoading && !micro.actif.value && voix.phase === 'inactif') micro.demarrer()
      }, 250)
    }
  }
})

onBeforeUnmount(() => {
  modeVocalContinu.value = false
  arreterBargeIn()
  micro.fermer()
  retirerPhoto()
  voix.taire()
})
</script>

<template>
  <section class="flex h-full flex-col overflow-hidden border border-mimosy-border bg-mimosy-surface" aria-label="Conversation avec Mimo">
    <header class="flex items-center gap-3 border-b border-mimosy-border bg-mimosy-page px-5 py-4 sm:px-6">
      <span class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mimosy-primary text-white" aria-hidden="true">
        <span
          v-if="animationEnCours"
          class="absolute inset-0 animate-pulse rounded-full border-2 border-mimosy-primary/40 motion-reduce:animate-none"
        ></span>
        <Volume2 v-if="voix.phase === 'parle'" :size="18" :stroke-width="2" />
        <Mic v-else-if="micro.actif.value" :size="18" :stroke-width="2" />
        <Sparkles v-else :size="18" :stroke-width="2" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-sans text-sm font-extrabold text-mimosy-text">Mimo <span class="font-medium text-mimosy-secondary">· Assistant IA</span></p>
        <p class="flex items-center gap-1.5 font-sans text-xs text-mimosy-secondary" role="status" aria-live="polite" data-testid="mimo-etat" :data-etat="etatAffiche.code">
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :class="{
              'bg-mimosy-primary': etatAffiche.code.startsWith('micro') || etatAffiche.code === 'voix-parle',
              'bg-mimosy-yellow': ['reflexion', 'analyse', 'voix-preparation', 'micro-transcription'].includes(etatAffiche.code),
              'bg-mimosy-secondary/50': etatAffiche.code === 'disponible',
            }"
          ></span>
          {{ etatAffiche.texte }}
        </p>
      </div>
      <button
        v-if="voix.phase === 'parle' || voix.phase === 'preparation'"
        type="button"
        class="flex h-9 items-center gap-1.5 rounded-full border border-mimosy-border px-3 font-sans text-xs font-bold text-mimosy-text transition hover:border-mimosy-primary"
        aria-label="Arrêter la voix de Mimo"
        data-testid="mimo-arreter-voix"
        @click="voix.taire()"
      >
        <Square :size="12" :stroke-width="2.6" /> Stop
      </button>
      <button
        v-if="modeVocalContinu"
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full bg-[#c0392b] text-white"
        aria-label="Quitter le mode vocal"
        @click="quitterModeVocal"
      >
        <MicOff :size="16" :stroke-width="2.2" />
      </button>
      <button
        v-if="fermable"
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-mimosy-secondary transition hover:bg-mimosy-surface hover:text-mimosy-text"
        aria-label="Fermer Mimo"
        data-testid="mimo-fermer"
        @click="emit('fermer')"
      >
        <X :size="18" :stroke-width="2.2" />
      </button>
    </header>

    <div ref="fil" class="flex min-h-55 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 sm:px-6" data-testid="mimo-fil" aria-live="polite">
      <p class="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-mimosy-page px-4 py-3 font-sans text-sm text-mimosy-text">
        Bonjour, je suis Mimo. Décrivez votre problème en quelques mots, je vous aide à trouver le bon professionnel.
      </p>

      <template v-for="(tour, index) in mimo.messages" :key="index">
        <div
          v-if="tour.role === 'client'"
          class="flex max-w-[85%] flex-col gap-2 self-end rounded-2xl rounded-tr-sm bg-mimosy-primary px-4 py-3 font-sans text-sm text-white"
          data-testid="mimo-message-client"
        >
          <MimoMedia v-if="tour.media" :media="tour.media" />
          <p v-else-if="tour.photo" class="flex items-center gap-1.5 text-xs opacity-90">
            <Camera :size="13" :stroke-width="2" /> {{ tour.photo }}
          </p>
          <p v-if="tour.texte" class="whitespace-pre-line">{{ tour.texte }}</p>
          <time v-if="tour.date" class="self-end text-[10px] opacity-75" :datetime="tour.date">{{ heure(tour.date) }}</time>
        </div>
        <div
          v-else
          class="flex max-w-[85%] flex-col gap-1.5 self-start rounded-2xl rounded-tl-sm bg-mimosy-page px-4 py-3 font-sans text-sm text-mimosy-text"
          :class="voix.messageEnCours && voix.messageEnCours === tour.messageId ? 'ring-2 ring-mimosy-primary/30' : ''"
          data-testid="mimo-message-mimo"
        >
          <p class="whitespace-pre-line">{{ tour.texte }}</p>
          <div v-if="tour.messageId" class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time v-if="tour.date" class="text-[10px] text-mimosy-secondary" :datetime="tour.date">{{ heure(tour.date) }}</time>
            <button
              v-if="voix.messageEnCours === tour.messageId"
              type="button"
              class="flex items-center gap-1 text-[11px] font-bold text-mimosy-primary"
              aria-label="Arrêter la lecture"
              @click="voix.taire()"
            >
              <Square :size="10" :stroke-width="2.8" /> {{ voix.phase === 'preparation' ? 'Préparation…' : 'Arrêter' }}
            </button>
            <button
              v-else
              type="button"
              class="flex items-center gap-1 text-[11px] font-bold text-mimosy-primary"
              aria-label="Réécouter cette réponse"
              data-testid="mimo-reecouter"
              @click="lireReponse(tour, true)"
            >
              <Volume2 :size="12" :stroke-width="2.2" /> Réécouter
            </button>
            <span v-if="voixIndisponible(tour)" class="text-[11px] text-mimosy-secondary" role="status" data-testid="mimo-voix-indisponible">
              Voix indisponible pour le moment : la réponse reste lisible ici.
            </span>
          </div>
        </div>
      </template>

      <p v-if="mimo.isLoading" class="flex items-center gap-2 self-start font-sans text-xs text-mimosy-secondary" data-testid="mimo-chargement">
        <LoaderCircle class="animate-spin motion-reduce:animate-none" :size="14" :stroke-width="2.2" />
        {{ mimo.analyseMediaEnCours ? 'Mimo analyse votre média…' : 'Mimo réfléchit…' }}
      </p>

      <div v-if="mimo.termine && resultat" class="mt-2 rounded-2xl border border-mimosy-border p-4 sm:p-5" data-testid="mimo-pre-diagnostic">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-sans text-sm font-extrabold uppercase tracking-[0.04em] text-mimosy-text">Pré-diagnostic</h3>
          <span
            class="rounded-full px-3 py-1 font-sans text-xs font-bold"
            :class="resultat.criticite === 'Élevée' ? 'bg-[#FFF0EE] text-[#c0392b]' : 'bg-mimosy-grayBg text-mimosy-gray'"
          >
            Criticité : {{ resultat.criticite }}
          </span>
        </div>
        <p class="mt-3 font-sans text-sm leading-relaxed text-mimosy-text">{{ resultat.pre_diagnostic }}</p>
        <p v-if="resultat.analyse_media" class="mt-3 rounded-lg bg-mimosy-page p-3 font-sans text-sm text-mimosy-text">
          Observation du média : {{ resultat.analyse_media }}
        </p>
        <p v-else-if="resultat.media && !resultat.media.analyse_effectuee" class="mt-3 rounded-lg bg-mimosy-page p-3 font-sans text-xs text-mimosy-secondary">
          Le média est conservé dans cette session, mais je n'ai pas pu produire d'observation visuelle. L'audio de la vidéo n'a pas été analysé.
        </p>
        <p class="mt-2 font-sans text-xs text-mimosy-secondary">
          J’ai préparé la suite avec les informations recueillies. Tu peux confirmer pour chercher un professionnel adapté.
        </p>

        <dl v-if="resultat.domaine || resultat.service_recommande" class="mt-4 grid gap-3 sm:grid-cols-2">
          <div v-if="resultat.domaine">
            <dt class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Orientation</dt>
            <dd class="mt-1 font-sans text-sm font-bold text-mimosy-text" data-testid="mimo-orientation">{{ resultat.domaine }}</dd>
          </div>
          <div v-if="resultat.service_recommande">
            <dt class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Service</dt>
            <dd class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ resultat.service_recommande }}</dd>
          </div>
        </dl>

        <section v-if="resultat.tarifs?.length" class="mt-4 border-t border-mimosy-border pt-4" data-testid="mimo-tarifs">
          <h4 class="font-sans text-xs font-bold uppercase text-mimosy-secondary">{{ textesTarifs.titre }}</h4>
          <p v-for="tarif in resultat.tarifs" :key="tarif.unite" class="mt-2 font-sans text-sm font-bold text-mimosy-text">
            {{ formatFourchette(tarif) }} FCFA / {{ tarif.unite }}
            <span class="font-normal text-mimosy-secondary">· {{ tarif.nb_offres }} offre{{ tarif.nb_offres > 1 ? 's' : '' }}</span>
          </p>
          <p class="mt-1 font-sans text-xs text-mimosy-secondary">{{ textesTarifs.note }}</p>
        </section>
        <p v-else-if="resultat.service_recommande" class="mt-4 font-sans text-xs text-mimosy-secondary" data-testid="mimo-tarifs-absents">
          Aucun tarif public n’est disponible pour ce service. Le professionnel pourra établir un devis.
        </p>

        <p v-if="mimo.pieces.length" class="mt-3 flex items-center gap-1.5 font-sans text-xs text-mimosy-secondary">
          <Camera :size="13" :stroke-width="2" />
          {{ mimo.pieces.length }} photo{{ mimo.pieces.length > 1 ? 's' : '' }} pourr{{ mimo.pieces.length > 1 ? 'ont' : 'a' }} être jointe{{ mimo.pieces.length > 1 ? 's' : '' }} à votre demande.
        </p>
        <button
          v-else
          type="button"
          class="mt-3 flex items-center gap-1.5 rounded-full border border-mimosy-primary px-3 py-1.5 font-sans text-xs font-bold text-mimosy-primary disabled:opacity-50"
          :disabled="mimo.isLoading"
          data-testid="mimo-ajouter-photo"
          @click="choisirPhoto"
        >
          <Camera :size="14" :stroke-width="2" /> Ajouter une photo pour le professionnel
        </button>

        <div v-if="resultat.warnings?.length" class="mt-4 flex items-start gap-2.5 rounded-xl bg-mimosy-yellowBg p-3.5">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-mimosy-yellowText" />
          <div>
            <p v-for="(avertissement, i) in resultat.warnings" :key="i" class="font-sans text-xs text-mimosy-yellowText">{{ avertissement }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2.5">
          <button type="button" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50" :disabled="confirmationEnCours" data-testid="mimo-voir-prestataires" @click="voirPrestataires">
            {{ confirmationEnCours ? 'Confirmation…' : 'Oui, chercher un professionnel' }}
          </button>
          <button type="button" class="flex items-center gap-1.5 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="recommencer">
            <RotateCcw :size="15" :stroke-width="2" /> Recommencer
          </button>
        </div>
      </div>
    </div>

    <input ref="champPhoto" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" class="hidden" data-testid="mimo-champ-photo" @change="surPhoto" />

    <form class="border-t border-mimosy-border px-5 py-4 sm:px-6" @submit.prevent="envoyer()">
      <div v-if="demandePhoto && !microVisible" class="mb-3 flex flex-wrap gap-2">
        <button type="button" class="flex items-center gap-1.5 rounded-full border border-mimosy-primary px-3 py-1.5 font-sans text-xs font-bold text-mimosy-primary" data-testid="mimo-bouton-photo" @click="choisirPhoto">
          <Camera :size="14" :stroke-width="2" /> Envoyer une photo
        </button>
        <button type="button" class="flex items-center gap-1.5 rounded-full border border-mimosy-border px-3 py-1.5 font-sans text-xs font-bold text-mimosy-secondary" :disabled="mimo.isLoading" data-testid="mimo-pas-de-photo" @click="pasDePhoto">
          <ImageOff :size="14" :stroke-width="2" /> Je n'ai pas de photo
        </button>
      </div>

      <!-- Aperçu du média AVANT l'envoi : le client vérifie qu'il s'agit du bon fichier. -->
      <div v-if="apercuPhoto" class="mb-3 flex items-start gap-3 rounded-2xl border border-mimosy-border p-2" data-testid="mimo-apercu">
        <div
          v-if="photoChoisie?.type?.startsWith('video/') && apercuIllisible"
          class="flex h-28 w-40 flex-col items-center justify-center gap-1 rounded-xl bg-mimosy-page px-2 text-center font-sans text-[11px] text-mimosy-secondary"
          role="status"
          data-testid="mimo-apercu-video-illisible"
        >
          <ImageOff :size="16" :stroke-width="2" />
          Aperçu impossible dans ce navigateur (format HEVC probable). La vidéo sera convertie à l’envoi.
        </div>
        <video
          v-else-if="photoChoisie?.type?.startsWith('video/')"
          :src="apercuPhoto"
          controls
          playsinline
          preload="metadata"
          class="h-28 w-40 rounded-xl bg-black object-contain"
          :aria-label="`Aperçu de la vidéo ${photoChoisie?.name || ''}`"
          data-testid="mimo-apercu-video"
          @error="apercuIllisible = true"
        ></video>
        <button
          v-else
          type="button"
          class="overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-mimosy-primary"
          aria-label="Agrandir la photo sélectionnée"
          @click="apercuAgrandi = true"
        >
          <img :src="apercuPhoto" alt="Photo sélectionnée" class="h-20 w-20 object-cover" data-testid="mimo-apercu-image" />
        </button>
        <div class="min-w-0 flex-1 pt-1">
          <p class="truncate font-sans text-xs font-bold text-mimosy-text">{{ photoChoisie?.name }}</p>
          <p class="font-sans text-[11px] text-mimosy-secondary">Prêt à être envoyé avec votre message.</p>
        </div>
        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg text-mimosy-secondary hover:bg-mimosy-page" aria-label="Retirer le média" @click="retirerPhoto">
          <X :size="16" :stroke-width="2.5" />
        </button>
        <MimoVisionneuse v-if="apercuAgrandi" :src="apercuPhoto" alt="Photo sélectionnée" @fermer="apercuAgrandi = false" />
      </div>

      <!-- Micro actif : état explicite, onde réelle, terminer ou annuler. -->
      <div
        v-if="microVisible"
        class="mb-3 flex flex-col gap-2 rounded-2xl border border-mimosy-primary/40 bg-mimosy-primaryBg px-4 py-3"
        data-testid="mimo-micro"
        :data-etat="micro.etat.value"
      >
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3 shrink-0" aria-hidden="true">
            <span v-if="micro.etat.value === 'parole'" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-mimosy-primary/60 motion-reduce:animate-none"></span>
            <span class="relative inline-flex h-3 w-3 rounded-full" :class="micro.etat.value === 'transcription' ? 'bg-mimosy-yellow' : 'bg-[#c0392b]'"></span>
          </span>
          <p class="flex-1 font-sans text-sm font-bold text-mimosy-text" role="status" aria-live="assertive">{{ libellesMicro[micro.etat.value] }}</p>
          <LoaderCircle v-if="micro.etat.value === 'transcription' || micro.etat.value === 'autorisation'" class="animate-spin text-mimosy-secondary motion-reduce:animate-none" :size="16" />
        </div>
        <MimoOndeMicro :bandes="micro.bandes.value" :vivante="micro.etat.value !== 'transcription'" />
        <p v-if="micro.partiel.value" class="font-sans text-sm italic text-mimosy-text" data-testid="mimo-micro-partiel">« {{ micro.partiel.value }} »</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="flex min-h-11 items-center gap-1.5 rounded-xl bg-mimosy-primary px-4 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            :disabled="micro.etat.value === 'transcription' || micro.etat.value === 'autorisation'"
            data-testid="mimo-micro-terminer"
            @click="micro.terminer()"
          >
            <Check :size="16" :stroke-width="2.4" /> J’ai terminé
          </button>
          <button
            type="button"
            class="flex min-h-11 items-center gap-1.5 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 font-sans text-sm font-bold text-mimosy-text transition hover:border-[#c0392b] hover:text-[#c0392b]"
            data-testid="mimo-micro-annuler"
            @click="annulerMicro"
          >
            <X :size="16" :stroke-width="2.4" /> Annuler
          </button>
        </div>
      </div>

      <div class="flex items-end gap-2">
        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mimosy-border text-mimosy-secondary transition hover:border-mimosy-primary hover:text-mimosy-primary" aria-label="Joindre une photo ou une vidéo" @click="choisirPhoto">
          <Camera :size="18" :stroke-width="2" />
        </button>
        <button
          type="button"
          class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition"
          :class="micro.actif.value
            ? 'border-[#c0392b] bg-[#c0392b] text-white'
            : 'border-mimosy-border text-mimosy-secondary hover:border-mimosy-primary hover:text-mimosy-primary'"
          :aria-label="micro.actif.value ? 'Terminer l’enregistrement' : 'Parler à Mimo'"
          :aria-pressed="micro.actif.value"
          data-testid="mimo-micro-bouton"
          @click="basculerMicro"
        >
          <Square v-if="micro.actif.value" :size="16" :stroke-width="2.6" />
          <Mic v-else :size="18" :stroke-width="2" />
        </button>
        <label class="sr-only" for="mimo-saisie">Votre message pour Mimo</label>
        <textarea
          id="mimo-saisie"
          v-model="saisie"
          rows="2"
          maxlength="1000"
          :placeholder="mimo.messages.length ? 'Votre réponse…' : 'Ex. J\'ai une fuite d\'eau sous mon évier.'"
          class="min-h-11 flex-1 resize-none rounded-xl border border-mimosy-border px-3 py-2.5 font-sans text-sm text-mimosy-text outline-none transition focus:border-mimosy-primary"
          data-testid="mimo-saisie"
          @keydown.enter="surEntree"
        />
        <button type="submit" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mimosy-primary text-white transition hover:opacity-90 disabled:opacity-50" :disabled="!peutEnvoyer" aria-label="Envoyer" data-testid="mimo-envoyer">
          <Send :size="17" :stroke-width="2" />
        </button>
      </div>

      <p v-if="micro.etat.value === 'erreur' && micro.erreur.value" class="mt-2 font-sans text-sm text-[#c0392b]" role="alert" data-testid="mimo-micro-erreur">
        {{ micro.erreur.value }}
      </p>
      <p v-if="erreurPhoto || mimo.errorMessage" class="mt-2 font-sans text-sm text-[#c0392b]" role="alert">{{ erreurPhoto || mimo.errorMessage }}</p>
    </form>
  </section>
</template>
