<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Plus,
  RefreshCw,
  Star,
  Briefcase,
  MessageSquare,
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
// L'en-tête prestataire est rendu automatiquement par AppLayout pour
// role="prestataire" : pas besoin de l'importer ici.

import { useAuthStore } from '@/stores/auth'
import { useDemandePrestationStore } from '@/stores/demandePrestation'

import * as prestataireService from '@/services/prestataireService'
import * as reviewService from '@/services/reviewService'

const router = useRouter()

const authStore = useAuthStore()
const demandeStore = useDemandePrestationStore()

const loading = ref(false)
const error = ref('')

const offres = ref([])
const avis = ref([])
const profil = ref(null)

const bandeauFerme = ref(
  sessionStorage.getItem('mimosy_onboarding_ferme') === '1',
)

/* ---------------------------------------------------------
 * Utilisateur
 * ------------------------------------------------------- */
const userName = computed(() => {
  return (
    [authStore.user?.first_name, authStore.user?.last_name]
      .filter(Boolean)
      .join(' ') || 'Prestataire'
  )
})

const dateDuJour = computed(() => {
  const texte = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texte.charAt(0).toUpperCase() + texte.slice(1)
})

/* ---------------------------------------------------------
 * Avis, offres, statistiques
 * ------------------------------------------------------- */
const avisPublies = computed(() => {
  return avis.value.filter((item) => item.statut === 'PUBLIE')
})

const noteMoyenneValeur = computed(() => {
  if (!avisPublies.value.length) return 0

  const total = avisPublies.value.reduce(
    (sum, item) => sum + Number(item.note || 0),
    0,
  )

  return total / avisPublies.value.length
})

const noteMoyenne = computed(() => {
  return `${noteMoyenneValeur.value.toFixed(1).replace('.', ',')} / 5`
})

const offresActives = computed(() => {
  return offres.value.filter((item) => item.disponible)
})

const stats = computed(() => [
  {
    label: 'Offres disponibles',
    value: offresActives.value.length,
    icon: Briefcase,
  },
  {
    label: 'Avis publiés',
    value: avisPublies.value.length,
    icon: MessageSquare,
  },
  {
    label: 'Note moyenne',
    value: noteMoyenne.value,
    icon: Star,
  },
])

/* ---------------------------------------------------------
 * Demandes
 * ------------------------------------------------------- */
const demandesRecentes = computed(() => {
  return demandeStore.demandes.slice(0, 5)
})

const demandesEnAttente = computed(() => {
  return demandeStore.demandes.filter(
    (demande) => demande.statut === 'EN_ATTENTE',
  ).length
})

const statutLabels = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  REALISEE: 'Validation en attente',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const statutClasses = {
  EN_ATTENTE: 'bg-[#F2F3F0] text-[#1A1C1A]',
  ACCEPTEE: 'bg-[#2D6A4F] text-white',
  REFUSEE: 'bg-[#F2F3F0] text-[#1A1C1A]',
  REALISEE: 'bg-[#FFF7E6] text-[#9A723C]',
  TERMINEE: 'bg-[#F2F3F0] text-[#1A1C1A]',
  ANNULEE: 'bg-[#FEE2E2] text-[#991B1B]',
}

function initiale(nom) {
  return (nom || 'C').charAt(0).toUpperCase()
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—'
}

/* ---------------------------------------------------------
 * Onboarding
 * ------------------------------------------------------- */
const LIBELLES_ETAPES = {
  informations_personnelles: 'Informations personnelles',
  informations_professionnelles: 'Informations professionnelles',
  localisation: 'Localisation',
  services: 'Services',
  disponibilites: 'Disponibilités',
  verification_identite: "Vérification d'identité",
}

const completion = computed(() => profil.value?.completion || null)

const etapesAffichees = computed(() => {
  if (!completion.value) return []

  return Object.entries(completion.value.etapes).map(([cle, complete]) => ({
    cle,
    libelle: LIBELLES_ETAPES[cle] || cle,
    complete,
  }))
})

const etapesRestantes = computed(() => {
  return etapesAffichees.value.filter((etape) => !etape.complete).length
})

const profilIncomplet = computed(() => {
  return completion.value ? !completion.value.est_publiable : false
})

function fermerBandeau() {
  bandeauFerme.value = true
  sessionStorage.setItem('mimosy_onboarding_ferme', '1')
}

/* ---------------------------------------------------------
 * Navigation
 * ------------------------------------------------------- */
function voirToutesLesDemandes() {
  router.push('/prestataire/demandes')
}

function gererServices() {
  router.push('/prestataire/services')
}

function completerProfil() {
  router.push('/prestataire/profil')
}

/* ---------------------------------------------------------
 * Chargement
 * ------------------------------------------------------- */
async function chargerTableauDeBord() {
  loading.value = true
  error.value = ''

  try {
    const [offersData, reviewsData, profilData] = await Promise.all([
      prestataireService.listMyServiceOffers(),
      reviewService.listReviews(),
      prestataireService.getMyProviderProfile(),
      demandeStore.chargerDemandes(),
    ])

    offres.value = Array.isArray(offersData)
      ? offersData
      : offersData?.results || []

    avis.value = Array.isArray(reviewsData)
      ? reviewsData
      : reviewsData?.results || []

    profil.value = profilData
  } catch (requestError) {
    error.value =
      requestError?.message ||
      'Une erreur est survenue lors du chargement du tableau de bord.'
  } finally {
    loading.value = false
  }
}

onMounted(chargerTableauDeBord)
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-8 lg:gap-10 ">

          <!-- ================================================= -->
          <!-- EN-TÊTE -->
          <!-- ================================================= -->
          <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex flex-col gap-2">
              <p class="font-['DM_Sans'] text-sm text-[#1A1C1A] opacity-50">
                {{ dateDuJour }}
              </p>

              <h1
                class="font-['Instrument_Serif'] text-[36px] font-normal leading-[40px] text-[#1A1C1A] sm:text-[48px] sm:leading-[52px]"
              >
                Bonjour {{ userName }},
              </h1>

              <p class="font-['DM_Sans'] text-base leading-6 text-[#1A1C1A] opacity-60">
                Voici un résumé de votre activité aujourd'hui.
              </p>
            </div>

            <button
              type="button"
              class="inline-flex w-full cursor-pointer items-center justify-center gap-2 bg-[#2D6A4F] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-white transition-colors hover:bg-[#24573F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 sm:w-auto rounded-2xl"
              @click="gererServices"
            >
              <Plus class="h-4 w-4" :stroke-width="2" />
              Ajouter un service
            </button>
          </section>

          <!-- ================================================= -->
          <!-- CHARGEMENT (squelette) -->
          <!-- ================================================= -->
          <div
            v-if="loading"
            class="flex flex-col gap-8"
            aria-busy="true"
            aria-live="polite"
          >
            <span class="sr-only">Chargement de votre activité...</span>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div
                v-for="n in 3"
                :key="n"
                class="h-[168px] animate-pulse border border-[#E5E7E2] bg-[#FAFAF8] motion-reduce:animate-none"
              />
            </div>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div class="h-[360px] animate-pulse border border-[#E5E7E2] bg-[#FAFAF8] motion-reduce:animate-none xl:col-span-2" />
              <div class="h-[360px] animate-pulse border border-[#E5E7E2] bg-[#FAFAF8] motion-reduce:animate-none" />
            </div>
          </div>

          <!-- ================================================= -->
          <!-- ERREUR -->
          <!-- ================================================= -->
          <div
            v-else-if="error"
            class="flex flex-col gap-4 border border-[#E5B8B2] bg-[#FFF0EE] p-5 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <p class="font-['DM_Sans'] text-sm leading-5 text-[#A85148]">
              {{ error }}
            </p>

            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 self-start font-['DM_Sans'] text-sm font-semibold text-[#A85148] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A85148] focus-visible:ring-offset-2 sm:self-auto"
              @click="chargerTableauDeBord"
            >
              <RefreshCw class="h-4 w-4" :stroke-width="2" />
              Réessayer
            </button>
          </div>

          <template v-else>

            <!-- ============================================= -->
            <!-- ONBOARDING -->
            <!-- ============================================= -->
            <section
              v-if="!bandeauFerme && profilIncomplet"
              class="border border-[#2D6A4F]/30 bg-[#E2EAE4] p-5 sm:p-6 lg:p-8 rounded-2xl"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-['Instrument_Serif'] text-2xl leading-8 text-[#1A1C1A]">
                    Votre profil est complété à {{ completion.pourcentage }} %
                  </p>

                  <p class="mt-1 max-w-2xl font-['DM_Sans'] text-sm leading-5 text-[#1A1C1A] opacity-60">
                    Tant que votre profil n'est pas complet, vos services ne
                    sont pas visibles par les clients.
                    <template v-if="etapesRestantes">
                      Il reste {{ etapesRestantes }}
                      {{ etapesRestantes > 1 ? 'étapes' : 'étape' }}.
                    </template>
                  </p>
                </div>

                <button
                  type="button"
                  class="shrink-0 cursor-pointer font-['DM_Sans'] text-sm font-semibold text-[#2D6A4F] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
                  @click="fermerBandeau"
                >
                  Plus tard
                </button>
              </div>

              <div
                class="mt-5 h-2 w-full overflow-hidden bg-white mx-5"
                role="progressbar"
                :aria-valuenow="completion.pourcentage"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Progression du profil"
              >
                <div
                  class="h-full bg-[#2D6A4F] transition-all duration-500 motion-reduce:transition-none"
                  :style="{ width: `${completion.pourcentage}%` }"
                />
              </div>

              <ul class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <li
                  v-for="etape in etapesAffichees"
                  :key="etape.cle"
                  class="flex items-center gap-2"
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    :class="
                      etape.complete
                        ? 'bg-[#2D6A4F] text-white'
                        : 'border border-[#94A3B8]'
                    "
                    aria-hidden="true"
                  >
                    <Check v-if="etape.complete" class="h-3 w-3" :stroke-width="3" />
                  </span>

                  <span
                    class="font-['DM_Sans'] text-sm"
                    :class="etape.complete ? 'text-[#1A1C1A]' : 'text-[#64748B]'"
                  >
                    {{ etape.libelle }}
                    <span class="sr-only">
                      {{ etape.complete ? '(terminée)' : '(à faire)' }}
                    </span>
                  </span>
                </li>
              </ul>

              <button
                type="button"
                class="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 bg-[#2D6A4F] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-white transition-colors hover:bg-[#24573F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 sm:w-auto rounded-2xl"
                @click="completerProfil"
              >
                Compléter mon profil
                <ArrowRight class="h-4 w-4" :stroke-width="2" />
              </button>
            </section>

            <!-- ============================================= -->
            <!-- INDICATEURS PRINCIPAUX -->
            <!-- ============================================= -->
            <section class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">

              <!-- Demandes en attente -->
              <button
                type="button"
                class="group flex min-h-[168px] cursor-pointer flex-col justify-between gap-4 border border-[#E5E7E2] bg-[#FAFAF8] p-6 text-left transition-colors hover:border-[#2D6A4F]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 lg:p-8 rounded-2xl"
                @click="voirToutesLesDemandes"
              >
                <p class="font-['DM_Sans'] text-xs font-bold uppercase leading-4 tracking-[1.2px] text-[#1A1C1A] opacity-50">
                  Demandes en attente
                </p>

                <div class="flex items-end justify-between gap-4">
                  <span class="font-['Instrument_Serif'] text-5xl font-normal leading-[48px] text-[#1A1C1A]">
                    {{ demandesEnAttente }}
                  </span>

                  <span class="flex items-center gap-1 font-['DM_Sans'] text-sm leading-5 text-[#2D6A4F]">
                    Traiter
                    <ArrowUpRight
                      class="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </div>
              </button>

              <!-- Rendez-vous -->
              <article class="flex min-h-[168px] flex-col justify-between gap-4 border border-[#E5E7E2] bg-[#FAFAF8] p-6 lg:p-8 rounded-2xl">
                <p class="font-['DM_Sans'] text-xs font-bold uppercase leading-4 tracking-[1.2px] text-[#1A1C1A] opacity-50">
                  Rendez-vous à venir
                </p>

                <div class="flex items-end justify-between gap-4">
                  <span class="font-['Instrument_Serif'] text-5xl font-normal leading-[48px] text-[#1A1C1A]">
                    —
                  </span>

                  <span class="font-['DM_Sans'] text-sm italic leading-5 text-[#1A1C1A] opacity-40">
                    Aucun aperçu disponible
                  </span>
                </div>
              </article>

              <!-- Revenus -->
              <article class="flex min-h-[168px] flex-col justify-between gap-4 border border-[#2D6A4F] bg-[#2D6A4F] p-6 lg:p-8 rounded-2xl">
                <p class="font-['DM_Sans'] text-xs font-bold uppercase leading-4 tracking-[1.2px] text-[#F2F3F0] opacity-70">
                  Revenus du mois
                </p>

                <div class="flex flex-wrap items-end justify-between gap-2">
                  <div class="flex items-baseline">
                    <span class="font-['Instrument_Serif'] text-5xl font-normal leading-[48px] text-white">
                      —
                    </span>
                    <span class="ml-2 font-['Instrument_Serif'] text-lg leading-7 text-white">
                      FCFA
                    </span>
                  </div>

                  <span class="font-['DM_Sans'] text-sm leading-5 text-white opacity-80">
                    Voir dans Revenus
                  </span>
                </div>
              </article>
            </section>

            <!-- ============================================= -->
            <!-- INDICATEURS SECONDAIRES -->
            <!-- ============================================= -->
            <!-- <section
              class="grid grid-cols-1 divide-y divide-[#E5E7E2] border border-[#E5E7E2] bg-[#FAFAF8] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
              aria-label="Vos indicateurs"
            >
              <div
                v-for="stat in stats"
                :key="stat.label"
                class="flex items-center gap-4 px-6 py-5"
              >
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white text-[#2D6A4F]"
                  aria-hidden="true"
                >
                  <component :is="stat.icon" class="h-4 w-4" :stroke-width="2" />
                </span>

                <div class="min-w-0">
                  <p class="font-['Instrument_Serif'] text-2xl leading-7 text-[#1A1C1A]">
                    {{ stat.value }}
                  </p>
                  <p class="truncate font-['DM_Sans'] text-sm text-[#1A1C1A] opacity-60">
                    {{ stat.label }}
                  </p>
                </div>
              </div>
            </section> -->

            <!-- ============================================= -->
            <!-- DEMANDES + COLONNE LATÉRALE -->
            <!-- ============================================= -->
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">

              <!-- Demandes récentes -->
              <section class="border border-[#E5E7E2] bg-[#FAFAF8] p-5 sm:p-6 lg:p-8 xl:col-span-2 rounded-2xl">
                <div class="mb-6 flex items-center justify-between gap-4 lg:mb-8">
                  <h2 class="font-['Instrument_Serif'] text-2xl font-normal leading-8 text-[#1A1C1A]">
                    Demandes récentes
                  </h2>

                  <button
                    v-if="demandesRecentes.length"
                    type="button"
                    class="cursor-pointer border-b border-[#1A1C1A] pb-1 font-['DM_Sans'] text-xs font-bold uppercase leading-4 tracking-[1.2px] text-[#1A1C1A] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
                    @click="voirToutesLesDemandes"
                  >
                    Voir tout
                  </button>
                </div>

                <EmptyState
                  v-if="!demandesRecentes.length"
                  title="Aucune demande"
                  message="Les demandes reçues de vos clients apparaîtront ici."
                />

                <template v-else>
                  <!-- Mobile : liste de cartes -->
                  <ul class="flex flex-col divide-y divide-[#E5E7E2] md:hidden">
                    <li
                      v-for="demande in demandesRecentes"
                      :key="demande.id"
                      class="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white font-['DM_Sans'] text-xs font-semibold text-[#2D6A4F]"
                        aria-hidden="true"
                      >
                        {{ initiale(demande.client_nom) }}
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                          <p class="truncate font-['DM_Sans'] text-sm font-medium text-[#1A1C1A]">
                            {{ demande.client_nom || 'Client' }}
                          </p>

                          <span
                            class="inline-flex shrink-0 px-2 py-0.5 font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px]"
                            :class="statutClasses[demande.statut] || 'bg-[#F2F3F0] text-[#1A1C1A]'"
                          >
                            {{ statutLabels[demande.statut] || demande.statut }}
                          </span>
                        </div>

                        <p class="mt-1 truncate font-['DM_Sans'] text-sm text-[#1A1C1A] opacity-70">
                          {{ demande.service_nom || 'Service' }}
                        </p>

                        <p class="mt-1 font-['DM_Sans'] text-xs text-[#1A1C1A] opacity-50">
                          {{ formatDate(demande.date_creation) }}
                        </p>
                      </div>
                    </li>
                  </ul>

                  <!-- Tablette / desktop : tableau -->
                  <div class="hidden overflow-x-auto md:block">
                    <table class="w-full border-collapse">
                      <thead>
                        <tr class="border-b border-[#E5E7E2]">
                          <th scope="col" class="pb-4 text-left font-['DM_Sans'] text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A] opacity-50">
                            Client
                          </th>
                          <th scope="col" class="pb-4 text-left font-['DM_Sans'] text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A] opacity-50">
                            Service
                          </th>
                          <th scope="col" class="pb-4 text-left font-['DM_Sans'] text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A] opacity-50">
                            Date
                          </th>
                          <th scope="col" class="pb-4 text-right font-['DM_Sans'] text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A] opacity-50">
                            Statut
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr
                          v-for="demande in demandesRecentes"
                          :key="demande.id"
                          class="border-b border-[#E5E7E2] transition-colors last:border-b-0 hover:bg-white"
                        >
                          <td class="py-4 pr-4">
                            <div class="flex items-center gap-3">
                              <div
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white font-['DM_Sans'] text-xs font-semibold text-[#2D6A4F]"
                                aria-hidden="true"
                              >
                                {{ initiale(demande.client_nom) }}
                              </div>
                              <span class="font-['DM_Sans'] text-sm font-medium leading-5 text-[#1A1C1A]">
                                {{ demande.client_nom || 'Client' }}
                              </span>
                            </div>
                          </td>

                          <td class="py-4 pr-4 font-['DM_Sans'] text-sm leading-5 text-[#1A1C1A]">
                            {{ demande.service_nom || 'Service' }}
                          </td>

                          <td class="whitespace-nowrap py-4 pr-4 font-['DM_Sans'] text-sm leading-5 text-[#1A1C1A] opacity-60">
                            {{ formatDate(demande.date_creation) }}
                          </td>

                          <td class="py-4 text-right">
                            <span
                              class="inline-flex whitespace-nowrap px-3 py-1 font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px]"
                              :class="statutClasses[demande.statut] || 'bg-[#F2F3F0] text-[#1A1C1A]'"
                            >
                              {{ statutLabels[demande.statut] || demande.statut }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </section>

              <!-- Colonne latérale -->
              <div class="flex flex-col gap-6">

                <!-- Prochains rendez-vous -->
                <section class="flex-1 border border-[#E5E7E2] bg-[#FAFAF8] p-5 sm:p-6 lg:p-8 rounded-2xl">
                  <h2 class="pb-6 font-['Instrument_Serif'] text-2xl font-normal leading-8 text-[#1A1C1A]">
                    Prochains RDV
                  </h2>

                  <!--
                    Les rendez-vous seront branchés sur le store
                    rendezVous lors de l'intégration des données réelles.
                  -->
                  <div class="flex flex-col items-center justify-center gap-3 border border-dashed border-[#E5E7E2] px-4 py-8 text-center">
                    <span class="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7E2] bg-white text-[#2D6A4F]">
                      <CalendarDays class="h-4 w-4" :stroke-width="2" />
                    </span>
                    <p class="font-['DM_Sans'] text-sm text-[#1A1C1A] opacity-50">
                      Aucun rendez-vous à afficher.
                    </p>
                  </div>
                </section>

                <!-- Ajouter un service -->
                <button
                  type="button"
                  class="group flex w-full cursor-pointer flex-col items-center justify-center border border-[#E5E7E2] bg-[#FAFAF8] px-6 py-8 transition-colors duration-200 hover:border-[#2D6A4F]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 rounded-2xl"
                  @click="gererServices"
                >
                  <span class="flex h-14 w-14 items-center justify-center rounded-full border border-[#E5E7E2] transition-colors group-hover:border-[#2D6A4F] group-hover:bg-[#2D6A4F]">
                    <Plus
                      class="h-5 w-5 text-[#2D6A4F] transition-colors group-hover:text-white"
                      :stroke-width="1.8"
                    />
                  </span>

                  <span class="mt-4 font-['Instrument_Serif'] text-xl font-normal leading-7 text-[#1A1C1A]">
                    Ajouter un service
                  </span>

                  <span class="mt-2 max-w-[240px] text-center font-['DM_Sans'] text-xs leading-[19.5px] text-[#1A1C1A] opacity-50">
                    Élargissez votre offre pour attirer plus de clients à Dakar.
                  </span>
                </button>
              </div>
            </div>

            <!-- ============================================= -->
            <!-- PERFORMANCES FINANCIÈRES -->
            <!-- ============================================= -->
            <section class="border border-[#E5E7E2] bg-[#FAFAF8] p-5 sm:p-6 lg:p-8 rounded-2xl">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <h2 class="font-['Instrument_Serif'] text-2xl font-normal leading-8 text-[#1A1C1A]">
                  Performances financières
                </h2>

                <div class="flex items-center gap-4">
                  <span class="flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-[#2D6A4F]" />
                    <span class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]">
                      Revenus
                    </span>
                  </span>

                  <span class="flex items-center gap-2 opacity-30">
                    <span class="h-2 w-2 rounded-full bg-[#1A1C1A]" />
                    <span class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]">
                      Moyenne
                    </span>
                  </span>
                </div>
              </div>

              <!-- Graphique fantôme en attendant les données -->
              <div class="relative mt-8 h-44 border-t border-[#E5E7E2]">
                <div class="absolute inset-x-0 bottom-0 flex h-full items-end gap-2 px-1 pt-6 opacity-[0.08] sm:gap-3" aria-hidden="true">
                  <div
                    v-for="(h, i) in [35, 55, 40, 70, 50, 65, 45, 80, 60, 75, 55, 90]"
                    :key="i"
                    class="flex-1 bg-[#2D6A4F]"
                    :style="{ height: `${h}%` }"
                  />
                </div>

                <div class="relative flex h-full items-center justify-center px-4">
                  <p class="max-w-md text-center font-['DM_Sans'] text-sm text-[#1A1C1A] opacity-50">
                    Vos revenus s'afficheront ici dès vos premières prestations terminées.
                  </p>
                </div>
              </div>
            </section>

          </template>
    </div>
  </AppLayout>
</template>