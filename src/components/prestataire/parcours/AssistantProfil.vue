<!--
  Étape 1 : complétion du profil en conversation avec Aby, l'assistante IA
  de MIMOSY (toujours présentée comme une IA).

  Aby pose une question à la fois (à voix haute si la voix est
  activée) et explique pourquoi. Le prestataire répond à la voix ou par
  écrit, librement : le backend comprend la réponse (plusieurs informations
  à la fois, services cités en langage courant), la valide, la sauvegarde
  et ne redemande jamais ce qui est déjà connu. Le résumé permet de
  corriger toute information mal comprise.
  Langue : la première question est la langue de communication (français,
  anglais, wolof), modifiable ensuite dans l'en-tête. Aby parle, écoute et
  transcrit dans cette langue ; le profil reste enregistré en français.
-->
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, CircleHelp, Languages, Mic, Pencil, Send, Square, Volume2, VolumeX } from 'lucide-vue-next'

import { MButton } from '@/components/ui'
import * as parcoursService from '@/services/parcoursService'
import { creerEcoute, creerVoix } from '@/utils/mediaEntretien'

const props = defineProps({
  // Dépendances injectables (tests) ; en usage normal, celles du navigateur.
  dependances: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['profil-modifie'])

const LIBELLES = {
  metier: 'Profession',
  domaine: 'Domaine',
  services: 'Services',
  experience: 'Expérience',
  zone_intervention: 'Zone',
  disponibilites: 'Disponibilités',
  description: 'Description',
}

const etat = ref(null)
const chargement = ref(true)
const envoi = ref(false)
const erreur = ref('')
const correction = ref(null)
const saisie = ref('')
const selection = ref([])
const filConversation = ref(null)

// Voix et écoute.
const voixActive = ref(true)
const ecoute = ref(false)
const transcription = ref('')
// '' pendant l'écoute ; 'transcription' quand le serveur transcrit la réponse (wolof).
const etapeEcoute = ref('')
const changementLangue = ref(false)
let fluxMicro = null
// Langue de communication choisie (null tant qu'elle ne l'est pas : français).
const langueActuelle = () => etat.value?.langue || null
const voix = props.dependances.voix || creerVoix({ langue: langueActuelle })
const ecouteur =
  props.dependances.ecoute ||
  creerEcoute({ flux: () => fluxMicro, langue: langueActuelle, onEtape: (e) => (etapeEcoute.value = e) })
let dernierMessageLu = -1

const question = computed(() => {
  if (!etat.value) return null
  if (!correction.value) return etat.value.question
  const champ = correction.value
  return {
    champ,
    ...etat.value.questions[champ],
    options: etat.value.options?.[champ] || [],
    valeur_actuelle: etat.value.resume[champ],
  }
})
const avecSuggestions = computed(() => question.value?.type?.startsWith('texte_ou_choix'))
const choixMultiple = computed(() => question.value?.type === 'texte_ou_choix_multiple')
const conversationVisible = computed(() =>
  (etat.value?.conversation || []).filter((m) => m.role === 'assistant' || m.role === 'prestataire'),
)

function preparerSaisie(q) {
  saisie.value = ''
  selection.value = []
  if (!q) return
  const actuelle = q.valeur_actuelle
  if (q.champ === 'services') selection.value = (actuelle || []).map((s) => s.id)
  else if (q.champ !== 'domaine' && actuelle !== null && actuelle !== undefined && typeof actuelle !== 'object') {
    saisie.value = String(actuelle)
  }
}

async function defiler() {
  await nextTick()
  filConversation.value?.scrollTo?.({ top: filConversation.value.scrollHeight })
}

// Aby lit à voix haute ses nouveaux messages.
async function lireNouveauxMessages() {
  const messages = etat.value?.conversation || []
  const aLire = []
  messages.forEach((message, index) => {
    if (message.role === 'assistant' && index > dernierMessageLu) aLire.push({ message, index })
  })
  if (messages.length) dernierMessageLu = messages.length - 1
  if (!voixActive.value) return
  for (const { message, index } of aLire) {
    await voix.parler({ texte: message.texte, source: { source: 'assistant', index } })
  }
}

async function appliquer(nouvelEtat) {
  etat.value = nouvelEtat
  correction.value = null
  preparerSaisie(nouvelEtat.question)
  await defiler()
  lireNouveauxMessages()
}

async function charger() {
  chargement.value = true
  try {
    const reponse = await parcoursService.getAssistant()
    // À la reprise, seule la dernière question est relue.
    dernierMessageLu = Math.max(-1, (reponse.conversation?.length || 0) - 2)
    await appliquer(reponse)
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargement.value = false
  }
}

async function envoyer(valeur) {
  if (!question.value || envoi.value) return
  const contenu = valeur ?? (choixMultiple.value && selection.value.length && !saisie.value.trim() ? selection.value : saisie.value.trim())
  if (!contenu || (Array.isArray(contenu) && !contenu.length)) return
  voix.taire()
  envoi.value = true
  erreur.value = ''
  try {
    const reponse = await parcoursService.repondreAssistant(question.value.champ, contenu)
    await appliquer(reponse)
    emit('profil-modifie', reponse.termine)
  } catch (e) {
    // Le backend explique ce qu'il n'a pas compris, comme le ferait Aby.
    erreur.value = e.data?.detail || e.message
  } finally {
    envoi.value = false
  }
}

function basculerSelection(id) {
  selection.value = selection.value.includes(id) ? selection.value.filter((i) => i !== id) : [...selection.value, id]
}

// Réponse à la voix : la transcription remplit le champ, le prestataire relit et envoie.
async function parler() {
  if (ecoute.value) {
    ecouteur.arreter()
    return
  }
  voix.taire()
  erreur.value = ''
  try {
    if (!fluxMicro && navigator.mediaDevices?.getUserMedia) {
      fluxMicro = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
  } catch {
    erreur.value = "Micro inaccessible : autorisez-le dans votre navigateur, ou écrivez votre réponse."
    return
  }
  ecoute.value = true
  transcription.value = ''
  etapeEcoute.value = ''
  const texte = await ecouteur.ecouter((partiel) => {
    transcription.value = partiel
  })
  ecoute.value = false
  etapeEcoute.value = ''
  if (texte) saisie.value = texte
  else erreur.value = ecouteur.erreur || "Je n'ai pas entendu de réponse. Réessayez ou écrivez-la."
}

// Sans dictée du navigateur (wolof), la réponse est transcrite après coup par le serveur.
const transcriptionDiffere = computed(() => etat.value?.langue && etat.value.langue.dictee_navigateur === false)
const messageEcoute = computed(() => {
  if (etapeEcoute.value === 'transcription') return 'Transcription de votre réponse…'
  if (transcription.value) return transcription.value
  return transcriptionDiffere.value
    ? "Parlez maintenant. L'écoute s'arrête toute seule quand vous vous taisez."
    : 'Parlez maintenant…'
})

async function changerLangue(code) {
  if (!code || code === etat.value?.langue?.code || changementLangue.value) return
  voix.taire()
  changementLangue.value = true
  erreur.value = ''
  try {
    await appliquer(await parcoursService.definirLangue(code))
  } catch (e) {
    erreur.value = e.data?.langue || e.data?.detail || e.message
  } finally {
    changementLangue.value = false
  }
}

function basculerVoix() {
  voixActive.value = !voixActive.value
  if (!voixActive.value) voix.taire()
}

function corriger(champ) {
  correction.value = champ
  erreur.value = ''
  preparerSaisie(question.value)
}

function connu(valeur) {
  return !(valeur === null || valeur === undefined || valeur === '' || (Array.isArray(valeur) && !valeur.length))
}

function afficherValeur(champ, valeurChamp) {
  if (!connu(valeurChamp)) return 'À compléter'
  if (champ === 'domaine') return valeurChamp.libelle
  if (champ === 'services') return valeurChamp.map((s) => s.libelle).join(', ')
  if (champ === 'experience') return `${valeurChamp} an${valeurChamp > 1 ? 's' : ''}`
  return valeurChamp
}

onMounted(charger)
onBeforeUnmount(() => {
  voix.taire()
  ecouteur.arreter()
  fluxMicro?.getTracks().forEach((piste) => piste.stop())
})
</script>

<template>
  <section class="grid gap-5 lg:grid-cols-[1fr_320px]">
    <!-- Conversation -->
    <div class="flex min-h-[460px] flex-col border border-[#E5E7E2] bg-white">
      <div class="flex items-center justify-between gap-3 border-b border-[#E5E7E2] px-5 py-3">
        <div class="flex items-center gap-3">
          <span class="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#2D6A4F] text-sm font-bold text-white" aria-hidden="true">
            A
            <span class="absolute -bottom-1 -right-1 rounded-full bg-[#E4EDE7] px-1 text-[9px] font-bold text-[#2D6A4F]">IA</span>
          </span>
          <div>
            <p class="text-sm font-bold text-[#051F20]" data-test="nom-agent">Aby · Assistante IA de MIMOSY</p>
            <p class="text-xs text-[#7A847E]">Intelligence artificielle. Vos réponses sont enregistrées au fur et à mesure.</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <!-- Langue de communication : modifiable une fois choisie. -->
          <label v-if="etat?.langue" class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#2D6A4F] hover:bg-[#F1F5F1]">
            <Languages class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only">Langue de communication</span>
            <select
              :value="etat.langue.code"
              :disabled="changementLangue"
              class="cursor-pointer bg-transparent text-xs font-semibold text-[#2D6A4F] focus:outline-none"
              data-test="langue"
              @change="changerLangue($event.target.value)"
            >
              <option v-for="l in etat.langues" :key="l.code" :value="l.code">{{ l.libelle }}</option>
            </select>
          </label>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#2D6A4F] hover:bg-[#F1F5F1]"
            :aria-pressed="voixActive"
            data-test="voix"
            @click="basculerVoix"
          >
            <component :is="voixActive ? Volume2 : VolumeX" class="h-4 w-4" aria-hidden="true" />
            {{ voixActive ? 'Voix activée' : 'Voix coupée' }}
          </button>
        </div>
      </div>

      <div ref="filConversation" class="flex max-h-[420px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-4" aria-live="polite">
        <p v-if="chargement" class="text-sm text-[#7A847E]">Chargement…</p>
        <div
          v-for="(message, index) in conversationVisible"
          v-else
          :key="index"
          class="max-w-[85%] rounded-xl px-4 py-2.5 text-[15px] leading-6"
          :class="message.role === 'assistant' ? 'self-start bg-[#F1F5F1] text-[#1C2420]' : 'self-end bg-[#2D6A4F] text-white'"
          data-test="message"
        >
          <span v-if="message.role === 'assistant'" class="block text-xs font-bold text-[#2D6A4F]">Aby</span>
          {{ message.texte }}
        </div>
      </div>

      <!-- Réponse : à la voix ou par écrit -->
      <form v-if="question" class="flex flex-col gap-2 border-t border-[#E5E7E2] px-5 py-4" @submit.prevent="envoyer()">
        <p v-if="correction" class="text-sm font-bold text-[#051F20]">Correction : {{ question.texte }}</p>
        <p v-if="question.pourquoi" class="text-xs text-[#4F5A54]">Pourquoi cette question ? {{ question.pourquoi }}</p>

        <!-- Suggestions du catalogue (domaine, services) -->
        <div v-if="avecSuggestions && question.options?.length" class="flex flex-wrap gap-2" data-test="suggestions">
          <button
            v-for="option in question.options"
            :key="option.id"
            type="button"
            class="rounded-full border px-3 py-1 text-sm"
            :class="selection.includes(option.id) ? 'border-[#2D6A4F] bg-[#F1F5F1] text-[#2D6A4F]' : 'border-[#D3D7D0] text-[#1C2420]'"
            :aria-pressed="choixMultiple ? selection.includes(option.id) : undefined"
            @click="choixMultiple ? basculerSelection(option.id) : envoyer(option.id)"
          >
            {{ option.libelle }}
          </button>
        </div>

        <p v-if="ecoute" class="rounded-lg bg-[#FAFAF8] px-3 py-2 text-sm italic text-[#4F5A54]" data-test="transcription">
          {{ messageEcoute }}
        </p>
        <p v-if="etat?.langue && etat.langue.code !== 'fr'" class="text-xs text-[#7A847E]" data-test="note-langue">
          Vos informations seront enregistrées en français sur votre profil.
        </p>

        <div class="flex items-end gap-2">
          <textarea
            v-if="question.type === 'texte_long'"
            v-model="saisie"
            rows="3"
            maxlength="1000"
            class="min-w-0 flex-1 rounded-xl border border-[#D3D7D0] px-3 py-2 text-[15px]"
            :aria-label="question.texte"
            data-test="reponse-texte"
          />
          <input
            v-else
            v-model="saisie"
            type="text"
            :inputmode="question.type === 'nombre' ? 'numeric' : 'text'"
            :placeholder="question.exemple || 'Votre réponse, en quelques mots'"
            maxlength="255"
            class="h-11 min-w-0 flex-1 rounded-xl border border-[#D3D7D0] px-3 text-[15px]"
            :aria-label="question.texte"
            data-test="reponse-texte"
          />
          <MButton
            :variant="ecoute ? 'secondary' : 'outline'"
            :icon="ecoute ? Square : Mic"
            icon-only
            :aria-label="ecoute ? 'Terminer ma réponse' : 'Répondre à la voix'"
            data-test="micro"
            @click="parler"
          />
          <MButton
            type="submit"
            :icon="Send"
            :loading="envoi"
            :disabled="!saisie.trim() && !(choixMultiple && selection.length)"
            data-test="envoyer"
          >
            Envoyer
          </MButton>
        </div>

        <p v-if="erreur" class="text-sm text-[#A4443A]" role="alert" data-test="erreur-assistant">{{ erreur }}</p>
        <MButton v-if="correction" variant="ghost" size="sm" class="self-start" @click="correction = null; preparerSaisie(etat.question)">
          Annuler la correction
        </MButton>
      </form>
    </div>

    <!-- Profil : ce qui est connu, ce qui manque -->
    <aside class="border border-[#E5E7E2] bg-white p-5">
      <p class="text-sm font-bold text-[#051F20]">Votre profil</p>
      <dl class="mt-3 flex flex-col gap-2 border-b border-[#F2F3F0] pb-3 text-sm" data-test="compte">
        <div v-for="(valeur, cle) in etat?.compte || {}" :key="cle" class="flex items-center justify-between gap-2">
          <dt class="text-[#7A847E]">{{ { nom: 'Nom', email: 'E-mail', telephone: 'Téléphone' }[cle] }}</dt>
          <dd class="flex items-center gap-1 truncate text-[#1C2420]">
            {{ valeur }} <Check class="h-3.5 w-3.5 shrink-0 text-[#2D6A4F]" aria-label="déjà connu" />
          </dd>
        </div>
      </dl>
      <dl class="mt-3 flex flex-col gap-3">
        <div v-for="(libelle, champ) in LIBELLES" :key="champ" class="border-b border-[#F2F3F0] pb-2">
          <dt class="flex items-center justify-between text-xs font-semibold text-[#7A847E]">
            <span class="flex items-center gap-1">
              <Check v-if="connu(etat?.resume?.[champ])" class="h-3.5 w-3.5 text-[#2D6A4F]" aria-label="renseigné" />
              <CircleHelp v-else class="h-3.5 w-3.5 text-[#7A847E]" aria-label="à compléter" />
              {{ libelle }}
            </span>
            <button
              v-if="connu(etat?.resume?.[champ])"
              type="button"
              class="flex items-center gap-1 text-[#2D6A4F] hover:underline"
              :aria-label="`Corriger : ${libelle}`"
              :data-test="`corriger-${champ}`"
              @click="corriger(champ)"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" /> Corriger
            </button>
          </dt>
          <dd class="mt-0.5 text-sm" :class="connu(etat?.resume?.[champ]) ? 'text-[#1C2420]' : 'text-[#7A847E]'">
            {{ afficherValeur(champ, etat?.resume?.[champ]) }}
          </dd>
        </div>
      </dl>
    </aside>
  </section>
</template>
