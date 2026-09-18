<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppLayout from '@/components/layout/AppLayout.vue'

import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'

import { creerAvis } from '@/services/avisService'

const route = useRoute()
const router = useRouter()

const demandeStore = useDemandePrestationStore()
const prestataireStore = usePrestataireStore()

const demande = computed(() => demandeStore.demandeSelectionnee)
const prestataire = computed(() => prestataireStore.prestataireSelectionne)

const contactOpen = ref(false)
const cancelOpen = ref(false)

const avisOpen = ref(false)
const avisNote = ref(0)
const avisCommentaire = ref('')
const avisLoading = ref(false)
const avisError = ref('')
const avisSuccess = ref('')

const statutConfig = {
  EN_ATTENTE: {
    label: 'En attente',
    background: '#EDF4FF',
    color: '#3267B1',
  },

  ACCEPTEE: {
    label: 'Acceptée',
    background: '#EAF8F2',
    color: '#16805B',
  },

  REFUSEE: {
    label: 'Refusée',
    background: '#FFF0EE',
    color: '#C53B35',
  },

  TERMINEE: {
    label: 'Terminée',
    background: '#EAF8F2',
    color: '#16805B',
  },

  ANNULEE: {
    label: 'Annulée',
    background: '#FFF0EE',
    color: '#C53B35',
  },
}

const statutActuel = computed(() => {
  return (
    statutConfig[demande.value?.statut] ||
    statutConfig.EN_ATTENTE
  )
})

const dateCreation = computed(() => {
  return formatDate(demande.value?.date_creation)
})

const dateSouhaitee = computed(() => {
  return formatDate(demande.value?.date_souhaitee)
})

const canCancel = computed(() => {
  return ['EN_ATTENTE', 'ACCEPTEE'].includes(
    demande.value?.statut
  )
})

const peutDonnerAvis = computed(() => {
  return demande.value?.statut === 'TERMINEE'
})

const progressSteps = computed(() => {
  const status = demande.value?.statut

  const order = [
    'EN_ATTENTE',
    'ACCEPTEE',
    'TERMINEE',
  ]

  const currentIndex = order.indexOf(status)

  return [
    {
      key: 'EN_ATTENTE',
      label: 'Demande envoyée',
      done: currentIndex >= 0,
      active: status === 'EN_ATTENTE',
    },

    {
      key: 'ACCEPTEE',
      label: 'Demande acceptée',
      done: currentIndex >= 1,
      active: status === 'ACCEPTEE',
    },

    {
      key: 'TERMINEE',
      label: 'Prestation terminée',
      done: currentIndex >= 2,
      active: status === 'TERMINEE',
    },
  ]
})

function formatDate(value) {
  if (!value) {
    return 'Non renseignée'
  }

  return new Date(value).toLocaleString('fr-FR')
}

onMounted(() => {
  demandeStore
    .chargerDemande(route.params.id)
    .then((data) => {
      if (data?.prestataire) {
        return prestataireStore.chargerPrestataire(
          data.prestataire
        )
      }
    })
    .catch(() => {})
})

async function annulerDemande() {
  try {
    await demandeStore.annulerDemande(
      demande.value.id
    )

    cancelOpen.value = false
  } catch {
    // Le message est affiché par le store.
  }
}

function ouvrirAvis() {
  avisError.value = ''
  avisSuccess.value = ''
  avisNote.value = 0
  avisCommentaire.value = ''

  avisOpen.value = true
}

function fermerAvis() {
  if (avisLoading.value) {
    return
  }

  avisOpen.value = false
  avisError.value = ''
}

async function envoyerAvis() {
  avisError.value = ''
  avisSuccess.value = ''

  if (!demande.value?.id) {
    avisError.value = 'La demande est introuvable.'
    return
  }

  if (avisNote.value < 1 || avisNote.value > 5) {
    avisError.value = 'Veuillez sélectionner une note.'
    return
  }

  if (!avisCommentaire.value.trim()) {
    avisError.value = 'Veuillez écrire un commentaire.'
    return
  }

  avisLoading.value = true

  try {
    await creerAvis({
      prestation: demande.value.id,
      note: avisNote.value,
      commentaire: avisCommentaire.value.trim(),
    })

    avisSuccess.value =
      'Votre avis a été enregistré avec succès.'

    avisOpen.value = false
    avisNote.value = 0
    avisCommentaire.value = ''
  } catch (error) {
    console.error(
      'Erreur lors de l’envoi de l’avis :',
      error
    )

    avisError.value =
      error?.message ||
      'Impossible d’enregistrer votre avis.'
  } finally {
    avisLoading.value = false
  }
}

function retour() {
  router.back()
}
</script>

<template>
  <AppLayout>
    <div
      v-if="demandeStore.isLoading"
      class="rounded-3xl bg-white p-10 text-center text-[#64748B]"
    >
      Chargement de la demande...
    </div>

    <div
      v-else-if="demandeStore.errorMessage"
      class="rounded-3xl bg-[#FFF0EE] p-10 text-center text-[#A85148]"
    >
      {{ demandeStore.errorMessage }}
    </div>

    <div
      v-else-if="demande"
      class="mx-auto flex w-full max-w-6xl flex-col gap-8 p-10"
    >
      <!-- En-tête -->
      <div
        class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
      >
        <div class="flex items-start gap-4">
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] shadow-sm transition hover:bg-[#F5F6F4]"
            aria-label="Retour"
            @click="retour"
          >
            ←
          </button>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1
                class="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#051F20]"
              >
                Détail de la demande #{{ demande.id }}
              </h1>

              <span
                class="rounded-full px-3 py-1 text-xs font-bold"
                :style="{
                  background: statutActuel.background,
                  color: statutActuel.color,
                }"
              >
                {{ statutActuel.label }}
              </span>
            </div>

            <p class="text-sm text-[#64748B]">
              Créée le {{ dateCreation }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <!-- Donner un avis -->
          <button
            v-if="peutDonnerAvis"
            type="button"
            class="rounded-xl bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1D4033]"
            @click="ouvrirAvis"
          >
            Donner mon avis
          </button>

          <!-- Annuler -->
          <button
            v-if="canCancel"
            type="button"
            class="rounded-xl border border-[#E7B8B2] bg-white px-4 py-2.5 text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE]"
            @click="cancelOpen = true"
          >
            Annuler la demande
          </button>

          <!-- Contact -->
          <button
            v-if="prestataire"
            type="button"
            class="rounded-xl border border-[#2F6250] bg-white px-4 py-2.5 text-sm font-bold text-[#2F6250] transition hover:bg-[#EAF8F2]"
            @click="contactOpen = true"
          >
            Contacter le prestataire
          </button>
        </div>
      </div>

      <!-- Message succès avis -->
      <div
        v-if="avisSuccess"
        class="rounded-2xl border border-[#B8DEC9] bg-[#EAF8F2] px-5 py-4 text-sm font-bold text-[#16805B]"
      >
        {{ avisSuccess }}
      </div>

      <!-- Informations de la demande -->
      <section
        class="flex flex-col gap-6 rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
      >
        <div>
          <p
            class="text-sm font-bold uppercase tracking-wide text-[#94A3B8]"
          >
            Description
          </p>

          <p class="mt-2 leading-relaxed text-[#64748B]">
            {{ demande.description || 'Aucune description.' }}
          </p>
        </div>

        <div
          class="grid gap-5 border-t border-[#F1F5F9] pt-6 sm:grid-cols-2"
        >
          <!-- Prestataire -->
          <div>
            <p
              class="text-xs font-bold uppercase text-[#94A3B8]"
            >
              Prestataire
            </p>

            <p
              class="mt-1 text-sm font-bold text-[#334155]"
            >
              {{
                prestataire
                  ? `${prestataire.user_first_name || ''} ${prestataire.user_last_name || ''}`.trim() ||
                    prestataire.user_email ||
                    'Prestataire'
                  : 'Chargement...'
              }}
            </p>
          </div>

          <!-- Date -->
          <div>
            <p
              class="text-xs font-bold uppercase text-[#94A3B8]"
            >
              Date souhaitée
            </p>

            <p
              class="mt-1 text-sm font-bold text-[#334155]"
            >
              {{ dateSouhaitee }}
            </p>
          </div>

          <!-- Budget -->
          <div>
            <p
              class="text-xs font-bold uppercase text-[#94A3B8]"
            >
              Budget
            </p>

            <p
              class="mt-1 text-sm font-bold text-[#2F6250]"
            >
              {{
                Number(demande.budget || 0).toLocaleString(
                  'fr-FR'
                )
              }}
              FCFA
            </p>
          </div>

          <!-- Service -->
          <div>
            <p
              class="text-xs font-bold uppercase text-[#94A3B8]"
            >
              Service
            </p>

            <p
              class="mt-1 text-sm font-bold text-[#334155]"
            >
              {{
                demande.service_nom ||
                demande.service?.nom ||
                demande.service_name ||
                'Service non renseigné'
              }}
            </p>
          </div>
        </div>
      </section>

      <!-- Suivi -->
      <section
        class="rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
      >
        <div
          class="flex items-center justify-between gap-4"
        >
          <div>
            <h2
              class="text-lg font-extrabold text-[#051F20]"
            >
              Suivi de la demande
            </h2>

            <p class="mt-1 text-sm text-[#64748B]">
              L'état affiché provient directement de Django.
            </p>
          </div>

          <span
            class="rounded-full px-3 py-1.5 text-xs font-bold"
            :style="{
              background: statutActuel.background,
              color: statutActuel.color,
            }"
          >
            {{ statutActuel.label }}
          </span>
        </div>

        <div
          class="mt-8 grid gap-5 sm:grid-cols-3"
        >
          <div
            v-for="step in progressSteps"
            :key="step.key"
            class="flex items-center gap-3 sm:flex-col sm:items-start"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
              :class="
                step.done
                  ? 'bg-[#2F6250] text-white'
                  : 'bg-[#F1F5F9] text-[#94A3B8]'
              "
            >
              {{ step.done ? '✓' : '•' }}
            </span>

            <span
              class="text-sm font-bold"
              :class="
                step.active
                  ? 'text-[#2F6250]'
                  : 'text-[#64748B]'
              "
            >
              {{ step.label }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Demande introuvable -->
    <div
      v-else
      class="rounded-3xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-[#64748B]"
    >
      Demande introuvable.
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <!-- Modal annulation -->
      <div
        v-if="cancelOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#051F20]/50 px-4"
        @click.self="cancelOpen = false"
      >
        <div
          class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        >
          <h2
            class="text-lg font-extrabold text-[#051F20]"
          >
            Annuler cette demande ?
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-[#64748B]"
          >
            Cette action changera le statut de la demande
            en « Annulée ».
          </p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold text-[#334155]"
              @click="cancelOpen = false"
            >
              Retour
            </button>

            <button
              type="button"
              class="rounded-xl bg-[#A85148] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              :disabled="demandeStore.isLoading"
              @click="annulerDemande"
            >
              {{
                demandeStore.isLoading
                  ? 'Annulation...'
                  : 'Confirmer'
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal contact -->
      <div
        v-if="contactOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#051F20]/50 px-4"
        @click.self="contactOpen = false"
      >
        <div
          class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-xs font-bold uppercase tracking-wide text-[#94A3B8]"
              >
                Contact prestataire
              </p>

              <h2
                class="mt-1 text-xl font-extrabold text-[#051F20]"
              >
                {{
                  `${prestataire?.user_first_name || ''} ${prestataire?.user_last_name || ''}`.trim() ||
                  prestataire?.user_email ||
                  'Prestataire'
                }}
              </h2>
            </div>

            <button
              type="button"
              class="text-xl text-[#64748B]"
              aria-label="Fermer"
              @click="contactOpen = false"
            >
              ×
            </button>
          </div>

          <div class="mt-6 grid gap-3 text-sm">
            <a
              v-if="prestataire?.user_phone"
              :href="`tel:${prestataire.user_phone}`"
              class="rounded-xl bg-[#EAF8F2] px-4 py-3 font-bold text-[#2F6250]"
            >
              {{ prestataire.user_phone }}
            </a>

            <a
              v-if="prestataire?.user_email"
              :href="`mailto:${prestataire.user_email}`"
              class="rounded-xl bg-[#F8FAFC] px-4 py-3 font-bold text-[#334155]"
            >
              {{ prestataire.user_email }}
            </a>

            <p
              v-if="
                !prestataire?.user_phone &&
                !prestataire?.user_email
              "
              class="rounded-xl border border-dashed border-[#E2E8F0] px-4 py-3 text-[#64748B]"
            >
              Informations de contact non disponibles.
            </p>
          </div>
        </div>
      </div>

      <!-- Modal avis -->
      <div
        v-if="avisOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#051F20]/50 px-4"
        @click.self="fermerAvis"
      >
        <div
          class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-xs font-bold uppercase tracking-wide text-[#000307]"
              >
                Votre expérience
              </p>

              <h2
                class="mt-1 text-xl font-extrabold text-[#051F20]"
              >
                Donner votre avis
              </h2>

              <p
                class="mt-1 text-sm text-[#000307]"
              >
                Évaluez la prestation réalisée par le
                prestataire.
              </p>
            </div>

            <button
              type="button"
              class="text-xl text-[#64748B]"
              aria-label="Fermer"
              :disabled="avisLoading"
              @click="fermerAvis"
            >
              ×
            </button>
          </div>

          <!-- Note -->
          <div class="mt-6">
            <p
              class="text-sm font-bold text-[#334155]"
            >
              Votre note
            </p>

            <div class="mt-3 flex gap-2">
              <button
                v-for="note in 5"
                :key="note"
                type="button"
                class="text-3xl transition"
                :class="
                  note <= avisNote
                    ? 'text-[#2F6250]'
                    : 'text-[#01050a]'
                "
                :aria-label="`${note} étoile${note > 1 ? 's' : ''}`"
                @click="avisNote = note"
              >
                ★
              </button>
            </div>

            <p
              v-if="avisNote"
              class="mt-2 text-sm font-bold text-[#2F6250]"
            >
              {{ avisNote }}/5
            </p>
          </div>

          <!-- Commentaire -->
          <div class="mt-6">
            <label
              for="avis-commentaire"
              class="text-sm font-bold text-[#010408]"
            >
              Commentaire
            </label>

            <textarea
              id="avis-commentaire"
              v-model="avisCommentaire"
              rows="5"
              maxlength="1000"
              class="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-[#010408] text-sm outline-none transition focus:border-[#2F6250]"
              placeholder="Partagez votre expérience..."
              :disabled="avisLoading"
            />

            <p
              class="mt-1 text-right text-xs text-[#01060e]"
            >
              {{ avisCommentaire.length }}/1000
            </p>
          </div>

          <!-- Erreur -->
          <p
            v-if="avisError"
            class="mt-3 rounded-xl bg-[#FFF0EE] px-4 py-3 text-sm text-[#A85148]"
          >
            {{ avisError }}
          </p>

          <!-- Actions -->
          <div
            class="mt-6 flex justify-end gap-3"
          >
            <button
              type="button"
              class="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold text-[#334155]"
              :disabled="avisLoading"
              @click="fermerAvis"
            >
              Annuler
            </button>

            <button
              type="button"
              class="rounded-xl bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="
                avisLoading ||
                avisNote === 0 ||
                !avisCommentaire.trim()
              "
              @click="envoyerAvis"
            >
              {{
                avisLoading
                  ? 'Envoi...'
                  : 'Publier mon avis'
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>