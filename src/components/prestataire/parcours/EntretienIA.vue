<!--
  Étape 5 : entretien professionnel avec Fassa, l'assistante IA de MIMOSY,
  façon visioconférence.

  1. Préparation : présentation de Fassa (une IA, pas une personne), test
     caméra/micro, puis demande de consentement explicite (J'accepte / Annuler).
  2. Appel : Fassa (avatar, question en cours), compte à rebours 05:00,
     transcription Fassa / Vous, « Microphone » (on peut couper la parole à
     Fassa) ou « Écrire », « Question 2 sur 6 ».
  3. Envoi de l'enregistrement, puis dossier transmis à l'équipe MIMOSY.
  Langue : celle choisie avec Aby, rappelée (et modifiable) avant le début ;
  elle ne change plus pendant l'entretien. Le rapport reste en français.
-->
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Camera, Keyboard, Languages, Mic, MicOff, PhoneOff, RotateCcw, ShieldCheck, Square, Volume2, VolumeX } from 'lucide-vue-next'

import { MButton } from '@/components/ui'
import { formaterDuree, useEntretien } from '@/composables/useEntretien'
import * as parcoursService from '@/services/parcoursService'
import { enregistrementDisponible } from '@/utils/mediaEntretien'

const props = defineProps({
  // Dépendances injectables (tests) ; en usage normal, celles du navigateur.
  dependances: { type: Object, default: () => ({}) },
  compatible: { type: Boolean, default: () => enregistrementDisponible() },
  // Langue de communication choisie avec Aby (null : français) et langues proposées.
  langue: { type: Object, default: null },
  langues: { type: Array, default: () => [] },
})
const emit = defineEmits(['termine', 'langue-modifiee'])

const entretien = useEntretien({ langue: props.langue, ...props.dependances })
const changementLangue = ref(false)
const erreurLangue = ref('')

// Avant le début seulement : un entretien se déroule dans une seule langue.
async function changerLangue(code) {
  if (!code || code === entretien.langue.value?.code || changementLangue.value) return
  changementLangue.value = true
  erreurLangue.value = ''
  try {
    const etat = await parcoursService.definirLangue(code)
    entretien.langue.value = etat.langue
    emit('langue-modifiee', etat.langue)
  } catch (e) {
    erreurLangue.value = e.data?.langue || e.data?.detail || e.message
  } finally {
    changementLangue.value = false
  }
}
const demandeConsentement = ref(false)
const fluxOuvert = ref(false)
const flux = ref(null)
const erreurMateriel = ref('')
const modeEcrit = ref(false)
const reponseTapee = ref('')
const demarrage = ref(false)
const videoApercu = ref(null)
const videoAppel = ref(null)
const champEcrit = ref(null)
const filTranscription = ref(null)

const nomAgent = computed(() => entretien.agent.value?.nom || 'Fassa')
const dureeAnnoncee = computed(() => formaterDuree(entretien.dureeMax.value).replace(/^0/, ''))
const STATUTS = {
  ia_parle: 'parle',
  attente: 'vous écoute : à vous de répondre',
  ecoute: 'vous écoute',
  transcription: 'transcrit votre réponse',
  reflexion: 'prend note de votre réponse',
}
const statut = computed(() => `${nomAgent.value} ${STATUTS[entretien.etat.value] || ''}`.trim())

async function testerMateriel() {
  erreurMateriel.value = ''
  try {
    flux.value = await entretien.enregistreur.ouvrir()
    fluxOuvert.value = true
  } catch {
    erreurMateriel.value =
      "Impossible d'accéder à votre caméra ou à votre micro. Autorisez-les dans votre navigateur puis réessayez."
  }
}

// Rien n'est enregistré avant « J'accepte ».
async function accepter() {
  if (!fluxOuvert.value) return
  demarrage.value = true
  try {
    await entretien.demarrer(true)
  } finally {
    demarrage.value = false
    demandeConsentement.value = false
  }
}

async function basculerEcrit() {
  modeEcrit.value = !modeEcrit.value
  if (modeEcrit.value) {
    await nextTick()
    champEcrit.value?.focus()
  }
}

async function envoyerEcrit() {
  const texte = reponseTapee.value
  reponseTapee.value = ''
  await entretien.repondreEcrit(texte)
}

// La caméra s'affiche dans l'aperçu, puis dans la vue de soi pendant l'appel.
watch([videoApercu, videoAppel, flux], ([apercu, appel, fluxCamera]) => {
  for (const element of [apercu, appel]) {
    if (element && fluxCamera && element.srcObject !== fluxCamera) {
      element.srcObject = fluxCamera
      element.play?.()
    }
  }
})

// La transcription suit la conversation.
watch(
  () => [entretien.echanges.value.length, entretien.transcriptionDirecte.value],
  async () => {
    await nextTick()
    filTranscription.value?.scrollTo?.({ top: filTranscription.value.scrollHeight })
  },
)

watch(entretien.phase, (phase) => {
  if (phase === 'termine') emit('termine', entretien.parcoursFinal.value)
})

onBeforeUnmount(() => {
  for (const element of [videoApercu.value, videoAppel.value]) if (element) element.srcObject = null
})
</script>

<template>
  <section class="flex flex-col gap-5 border border-[#E5E7E2] bg-white p-5 sm:p-6">
    <!-- 1. Préparation -->
    <template v-if="entretien.phase.value === 'preparation'">
      <header class="flex flex-col gap-1">
        <h2 class="text-base font-bold text-[#051F20]" data-test="titre-entretien">
          Entretien professionnel — {{ dureeAnnoncee }}
        </h2>
        <p class="text-sm text-[#4F5A54]">
          Avec <strong>{{ nomAgent }}</strong>, l'assistante IA de vérification professionnelle de MIMOSY :
          une intelligence artificielle, pas une personne. Elle vous pose quelques questions courtes sur votre
          activité et votre expérience, {{ dureeAnnoncee.replace(':00', '') }} minutes au maximum. Vous répondez à la
          voix ou par écrit.
        </p>
      </header>

      <!-- Langue de l'entretien (celle choisie avec Aby), modifiable avant de commencer. -->
      <div v-if="langues.length > 1" class="flex flex-wrap items-center gap-2 text-sm text-[#1C2420]" data-test="langue-entretien">
        <Languages class="h-4 w-4 text-[#2D6A4F]" aria-hidden="true" />
        <label for="langue-entretien" class="font-semibold">Langue de l'entretien</label>
        <select
          id="langue-entretien"
          :value="entretien.langue.value?.code || 'fr'"
          :disabled="changementLangue || demarrage"
          class="h-9 rounded-lg border border-[#D3D7D0] bg-white px-2 text-sm"
          @change="changerLangue($event.target.value)"
        >
          <option v-for="l in langues" :key="l.code" :value="l.code">{{ l.libelle }}</option>
        </select>
        <span v-if="entretien.langue.value && entretien.langue.value.code !== 'fr'" class="text-xs text-[#68716C]">
          Le rapport transmis à l'équipe MIMOSY sera rédigé en français.
        </span>
        <p v-if="erreurLangue" class="w-full text-sm text-[#A4443A]" role="alert">{{ erreurLangue }}</p>
      </div>

      <p v-if="!compatible" class="rounded-lg bg-[#F8E8E4] p-4 text-sm text-[#A4443A]" data-test="incompatible">
        Votre navigateur ne permet pas d'enregistrer l'entretien. Utilisez une version récente de Chrome,
        Edge, Firefox ou Safari.
      </p>
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-[280px_1fr]">
          <div class="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[#1C2420]">
            <video v-show="fluxOuvert" ref="videoApercu" muted playsinline class="h-full w-full object-cover" />
            <Camera v-if="!fluxOuvert" class="h-7 w-7 text-[#D3D7D0]" aria-hidden="true" />
          </div>
          <div class="flex flex-col gap-3">
            <MButton variant="outline" :icon="Mic" data-test="tester-materiel" @click="testerMateriel">
              {{ fluxOuvert ? 'Caméra et micro prêts' : 'Tester ma caméra et mon micro' }}
            </MButton>
            <p v-if="erreurMateriel" class="text-sm text-[#A4443A]" role="alert">{{ erreurMateriel }}</p>
            <p class="text-xs text-[#4F5A54]">
              Conseil : installez-vous dans un endroit calme, le visage bien éclairé, le son de l'appareil allumé.
            </p>
          </div>
        </div>

        <!-- Consentement explicite : rien n'est enregistré sans « J'accepte ». -->
        <div
          v-if="demandeConsentement"
          class="flex flex-col gap-4 rounded-lg border border-[#2D6A4F] bg-[#F1F5F1] p-4"
          role="dialog"
          aria-labelledby="titre-consentement"
          data-test="consentement"
        >
          <p id="titre-consentement" class="flex items-start gap-2 text-sm text-[#1C2420]">
            <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-[#2D6A4F]" aria-hidden="true" />
            Cet entretien sera enregistré afin de permettre à l'équipe MIMOSY de vérifier votre dossier
            professionnel. L'enregistrement n'est visible que par l'équipe MIMOSY. Acceptez-vous de continuer ?
          </p>
          <div class="flex flex-wrap gap-2">
            <MButton :loading="demarrage" data-test="accepter" @click="accepter">J'accepte</MButton>
            <MButton variant="outline" :disabled="demarrage" data-test="annuler" @click="demandeConsentement = false">
              Annuler
            </MButton>
          </div>
        </div>
        <MButton v-else :disabled="!fluxOuvert" data-test="commencer" @click="demandeConsentement = true">
          Commencer l'entretien
        </MButton>
        <p v-if="entretien.erreur.value" class="text-sm text-[#A4443A]" role="alert">{{ entretien.erreur.value }}</p>
      </template>
    </template>

    <!-- 2. Appel en cours -->
    <div v-else-if="entretien.phase.value === 'en_cours'" class="flex flex-col overflow-hidden rounded-xl border border-[#D3D7D0]" data-test="appel">
      <!-- Barre du haut : qui parle, temps restant -->
      <div class="flex items-center justify-between gap-3 bg-[#1C2420] px-4 py-2.5 text-white">
        <p class="flex items-center gap-2 text-sm font-semibold">
          {{ nomAgent }}
          <span class="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Entretien IA</span>
        </p>
        <p
          class="font-mono text-sm tabular-nums"
          :class="entretien.finProche.value ? 'text-[#E5C88F]' : ''"
          :aria-label="`Temps restant : ${entretien.chrono.value}`"
          data-test="chrono"
        >
          Temps restant : {{ entretien.chronoDemarre.value ? entretien.chrono.value : formaterDuree(entretien.dureeMax.value) }}
        </p>
      </div>

      <!-- Scène : Fassa + vue de soi -->
      <div class="relative flex min-h-[240px] flex-col items-center justify-center gap-3 bg-[#26302B] px-6 py-7 text-center">
        <div class="relative" aria-hidden="true">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full border-4 bg-[#2D6A4F] text-2xl font-bold text-white transition-colors"
            :class="entretien.iaParle.value ? 'border-[#E4EDE7]' : 'border-[#2D6A4F]'"
          >
            {{ nomAgent.charAt(0) }}
          </div>
          <span class="absolute -bottom-1 -right-1 rounded-full bg-[#E4EDE7] px-1.5 text-[10px] font-bold text-[#2D6A4F]">IA</span>
        </div>
        <!-- Indicateur sobre de parole / d'écoute -->
        <div class="flex h-4 items-end gap-1" aria-hidden="true">
          <span
            v-for="barre in 5"
            :key="barre"
            class="w-1 rounded-sm bg-[#E4EDE7]"
            :class="entretien.iaParle.value || entretien.ecouteEnCours.value ? 'animate-pulse' : 'opacity-30'"
            :style="{ height: `${[6, 12, 16, 10, 7][barre - 1]}px`, animationDelay: `${barre * 120}ms` }"
          />
        </div>
        <p class="max-w-xl text-base leading-7 text-white sm:text-lg" aria-live="polite" data-test="texte-ia">
          « {{ entretien.texteIA.value }} »
        </p>
        <p class="flex items-center gap-2 text-sm text-[#D3D7D0]" data-test="statut-appel">
          <span class="h-2 w-2 rounded-full" :class="entretien.ecouteEnCours.value ? 'bg-[#E5C88F]' : 'bg-[#8FC1A9]'" aria-hidden="true" />
          {{ statut }}
        </p>

        <div class="absolute bottom-3 right-3 aspect-video w-24 overflow-hidden rounded-md border border-[#4F5A54] bg-black sm:w-36">
          <video ref="videoAppel" muted playsinline class="h-full w-full object-cover" aria-label="Votre caméra" />
        </div>
      </div>

      <!-- Transcription -->
      <div class="flex flex-col gap-3 bg-white px-4 py-4 sm:px-6">
        <p class="text-xs font-semibold uppercase tracking-wide text-[#68716C]">Transcription</p>
        <ol
          ref="filTranscription"
          class="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-lg bg-[#FAFAF8] px-3 py-3 text-[15px]"
          aria-live="polite"
          data-test="transcription"
        >
          <li v-for="(echange, index) in entretien.echanges.value" :key="index" data-test="echange">
            <p class="text-xs font-bold" :class="echange.role === 'ia' ? 'text-[#2D6A4F]' : 'text-[#051F20]'">
              {{ echange.role === 'ia' ? nomAgent : 'Vous' }}
              <span v-if="echange.mode" class="font-normal text-[#68716C]">· {{ echange.mode === 'VOIX' ? 'à la voix' : 'par écrit' }}</span>
            </p>
            <p class="text-[#1C2420]">{{ echange.texte }}</p>
          </li>
          <li v-if="entretien.ecouteEnCours.value" data-test="transcription-directe">
            <p class="text-xs font-bold text-[#051F20]">Vous <span class="font-normal text-[#68716C]">· en cours</span></p>
            <p class="text-[#4F5A54]">{{ entretien.transcriptionDirecte.value || 'Parlez maintenant…' }}</p>
          </li>
        </ol>
        <p v-if="entretien.consigne.value" class="text-sm text-[#8A5A12]" role="status" data-test="consigne">{{ entretien.consigne.value }}</p>
        <!-- La voix de Fassa n'a pas pu être jouée : on le dit, jamais un silence muet. -->
        <div
          v-if="entretien.voixIndisponible.value"
          class="flex flex-wrap items-start gap-3 rounded-xl border border-[#F0D9A8] bg-[#FFF8EA] px-3 py-2"
          role="alert"
          data-test="voix-indisponible"
        >
          <VolumeX class="mt-0.5 h-4 w-4 shrink-0 text-[#8A5A12]" aria-hidden="true" />
          <div class="min-w-0 flex-1 text-sm text-[#5C4A1E]">
            <p class="font-semibold">La voix de {{ entretien.agent.value.nom }} est momentanément indisponible.</p>
            <p>Sa dernière phrase est affichée ci-dessus ; vous pouvez y répondre normalement.</p>
          </div>
          <MButton
            variant="outline"
            size="sm"
            :icon="Volume2"
            :disabled="entretien.etat.value !== 'attente'"
            data-test="reecouter"
            @click="entretien.reecouter()"
          >
            Réécouter
          </MButton>
        </div>
        <MButton
          v-if="entretien.reponseNonEnvoyee.value"
          variant="outline"
          size="sm"
          :icon="RotateCcw"
          data-test="renvoyer"
          @click="entretien.renvoyer()"
        >
          Renvoyer ma réponse
        </MButton>

        <form v-if="modeEcrit" class="flex flex-col gap-2" @submit.prevent="envoyerEcrit">
          <textarea
            ref="champEcrit"
            v-model="reponseTapee"
            rows="2"
            maxlength="2000"
            class="rounded-xl border border-[#D3D7D0] px-3 py-2 text-[15px]"
            aria-label="Écrire votre réponse"
            data-test="reponse-ecrite"
          />
          <MButton type="submit" :disabled="!reponseTapee.trim() || ['reflexion', 'transcription'].includes(entretien.etat.value)" data-test="envoyer-reponse">
            Envoyer ma réponse
          </MButton>
        </form>

        <!-- Commandes -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#F2F3F0] pt-3">
          <div class="flex flex-wrap gap-2">
            <MButton
              v-if="!entretien.ecouteEnCours.value"
              :icon="Mic"
              :disabled="['reflexion', 'transcription'].includes(entretien.etat.value)"
              data-test="repondre-voix"
              @click="entretien.repondreVoix()"
            >
              Microphone
            </MButton>
            <MButton v-else variant="secondary" :icon="Square" data-test="fin-reponse" @click="entretien.terminerReponse()">
              J'ai terminé ma réponse
            </MButton>
            <MButton variant="outline" :icon="modeEcrit ? MicOff : Keyboard" data-test="mode-ecrit" @click="basculerEcrit">
              {{ modeEcrit ? 'Masquer la saisie' : 'Écrire' }}
            </MButton>
          </div>
          <div class="flex items-center gap-3">
            <p class="text-sm font-semibold text-[#4F5A54]" data-test="numero-question">
              Question {{ Math.max(1, entretien.questionNumero.value) }} sur {{ entretien.nombreQuestions.value }}
            </p>
            <MButton variant="ghost" size="sm" :icon="PhoneOff" data-test="raccrocher" @click="entretien.terminer()">
              Terminer
            </MButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Envoi / fin / erreur -->
    <p v-else-if="entretien.phase.value === 'envoi'" class="text-sm text-[#4F5A54]" data-test="envoi">
      Envoi de l'enregistrement et préparation de votre dossier par {{ nomAgent }}… Ne fermez pas cette page.
    </p>
    <p v-else-if="entretien.phase.value === 'termine'" class="rounded-lg bg-[#E4EDE7] p-4 text-sm text-[#2D6A4F]" data-test="termine">
      Merci. Votre entretien est terminé. Votre dossier complet a été transmis à l'équipe MIMOSY, qui prendra la
      décision finale.
    </p>
    <div v-else class="flex flex-col gap-3">
      <p class="rounded-lg bg-[#F8E8E4] p-4 text-sm text-[#A4443A]" role="alert">{{ entretien.erreur.value }}</p>
      <p class="text-sm text-[#4F5A54]">Rechargez la page pour recommencer l'entretien.</p>
    </div>
  </section>
</template>
