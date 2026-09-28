<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DevisDetail from '@/components/devis/DevisDetail.vue'

import * as devisService from '@/services/devisService'

const demandes = ref([])
const reponses = ref([])

const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const showResponseModal = ref(false)
const selectedDemande = ref(null)

const activeTab = ref('TOUS')
const currentPage = ref(1)
const itemsPerPage = 4

// Devis détaillé : le TOTAL n'est jamais envoyé, le backend le calcule
// (matériaux + main-d'œuvre + frais) et c'est lui que le client paiera.
function formulaireVide() {
  return {
    lignes: [],
    montant_main_oeuvre: '',
    montant_frais: '',
    description_frais: '',
    delai_estime: '',
    date_validite: '',
    conditions: '',
    description: '',
  }
}

const form = reactive(formulaireVide())

function reinitialiserFormulaire() {
  Object.assign(form, formulaireVide())
}

function ajouterLigne() {
  form.lignes.push({ designation: '', quantite: '1', unite: '', prix_unitaire: '' })
}

function retirerLigne(index) {
  form.lignes.splice(index, 1)
}

// Aperçu indicatif pendant la saisie uniquement : le total qui fait foi est
// celui renvoyé par le backend après l'envoi.
const apercuTotal = computed(() => {
  const materiaux = form.lignes.reduce(
    (somme, ligne) => somme + (Number(ligne.quantite) || 0) * (Number(ligne.prix_unitaire) || 0),
    0,
  )
  return materiaux + (Number(form.montant_main_oeuvre) || 0) + (Number(form.montant_frais) || 0)
})

const dateMinValidite = new Date().toISOString().slice(0, 10)

/* -------------------------------------------------------------------------- */
/* Données                                                                    */
/* -------------------------------------------------------------------------- */

const demandesAvecReponses = computed(() =>
  demandes.value.map((demande) => ({
    ...demande,
    reponse: reponses.value.find(
      (reponse) => reponse.demande === demande.id,
    ) || null,
  })),
)

const demandesFiltrees = computed(() => {
  if (activeTab.value === 'TOUS') {
    return demandesAvecReponses.value
  }

  if (activeTab.value === 'EN_ATTENTE') {
    return demandesAvecReponses.value.filter(
      (demande) => !demande.reponse,
    )
  }

  if (activeTab.value === 'ACCEPTE') {
    return demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'ACCEPTE',
    )
  }

  if (activeTab.value === 'REFUSE') {
    return demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'REFUSE',
    )
  }

  if (activeTab.value === 'EXPIRE') {
    return demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'EXPIRE',
    )
  }

  return demandesAvecReponses.value
})

const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(demandesFiltrees.value.length / itemsPerPage),
  ),
)

const demandesPage = computed(() => {
  const debut = (currentPage.value - 1) * itemsPerPage
  const fin = debut + itemsPerPage

  return demandesFiltrees.value.slice(debut, fin)
})

const pages = computed(() => {
  const total = totalPages.value

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  if (currentPage.value <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (currentPage.value >= total - 2) {
    return [
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ]
  }

  return [
    currentPage.value - 2,
    currentPage.value - 1,
    currentPage.value,
    currentPage.value + 1,
    currentPage.value + 2,
  ]
})

/* -------------------------------------------------------------------------- */
/* Compteurs                                                                  */
/* -------------------------------------------------------------------------- */

const nombreTous = computed(
  () => demandesAvecReponses.value.length,
)

const nombreEnAttente = computed(
  () =>
    demandesAvecReponses.value.filter(
      (demande) => !demande.reponse,
    ).length,
)

const nombreAcceptes = computed(
  () =>
    demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'ACCEPTE',
    ).length,
)

const nombreRefuses = computed(
  () =>
    demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'REFUSE',
    ).length,
)

const nombreExpires = computed(
  () =>
    demandesAvecReponses.value.filter(
      (demande) => demande.reponse?.statut === 'EXPIRE',
    ).length,
)

/* -------------------------------------------------------------------------- */
/* Chargement                                                                 */
/* -------------------------------------------------------------------------- */

async function chargerDevis() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [demandesData, reponsesData] = await Promise.all([
      devisService.listQuoteRequests(),
      devisService.listQuoteResponses(),
    ])

    demandes.value = Array.isArray(demandesData)
      ? demandesData
      : demandesData?.results || []

    reponses.value = Array.isArray(reponsesData)
      ? reponsesData
      : reponsesData?.results || []

    currentPage.value = 1
  } catch (error) {
    errorMessage.value =
      error?.message || 'Impossible de charger les devis.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  chargerDevis()
})

/* -------------------------------------------------------------------------- */
/* Onglets                                                                    */
/* -------------------------------------------------------------------------- */

function changerOnglet(tab) {
  activeTab.value = tab
  currentPage.value = 1
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

function allerPage(page) {
  if (page < 1 || page > totalPages.value) {
    return
  }

  currentPage.value = page

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function pagePrecedente() {
  allerPage(currentPage.value - 1)
}

function pageSuivante() {
  allerPage(currentPage.value + 1)
}

/* -------------------------------------------------------------------------- */
/* Modal de réponse                                                           */
/* -------------------------------------------------------------------------- */

function ouvrirReponse(demande) {
  selectedDemande.value = demande

  reinitialiserFormulaire()

  errorMessage.value = ''
  showResponseModal.value = true
}

function fermerReponse() {
  if (isSubmitting.value) {
    return
  }

  showResponseModal.value = false
  selectedDemande.value = null

  reinitialiserFormulaire()
}

async function envoyerReponse() {
  if (
    !selectedDemande.value ||
    form.montant_main_oeuvre === '' ||
    !form.delai_estime
  ) {
    errorMessage.value =
      'Veuillez renseigner la main-d’œuvre (0 si tout est dans les matériaux) et le délai.'
    return
  }

  if (form.lignes.some((ligne) => !ligne.designation.trim() || !(Number(ligne.quantite) > 0) || ligne.prix_unitaire === '')) {
    errorMessage.value =
      'Chaque matériau doit avoir une désignation, une quantité et un prix unitaire.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await devisService.createQuoteResponse({
      demande: selectedDemande.value.id,
      lignes_materiaux: form.lignes.map((ligne) => ({
        designation: ligne.designation.trim(),
        quantite: ligne.quantite,
        unite: ligne.unite.trim(),
        prix_unitaire: ligne.prix_unitaire,
      })),
      montant_main_oeuvre: form.montant_main_oeuvre,
      montant_frais: form.montant_frais === '' ? '0' : form.montant_frais,
      description_frais: form.description_frais.trim(),
      conditions: form.conditions.trim(),
      date_validite: form.date_validite || null,
      description: form.description.trim(),
      delai_estime: form.delai_estime,
    })

    fermerReponse()

    await chargerDevis()
  } catch (error) {
    errorMessage.value =
      error?.message || 'Impossible d’envoyer la réponse.'
  } finally {
    isSubmitting.value = false
  }
}

/* -------------------------------------------------------------------------- */
/* Formatage                                                                  */
/* -------------------------------------------------------------------------- */

function formatMontant(value) {
  if (value === null || value === undefined || value === '') {
    return '0'
  }

  return Number(value).toLocaleString('fr-FR')
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statutLabel(demande) {
  if (!demande.reponse) {
    return 'En attente'
  }

  const statuts = {
    EN_ATTENTE: 'En attente',
    ACCEPTE: 'Accepté',
    ACCEPTEE: 'Accepté',
    REFUSE: 'Refusé',
    REFUSEE: 'Refusé',
    EXPIRE: 'Expiré',
    EXPIREE: 'Expiré',
  }

  return statuts[demande.reponse.statut] ||
    demande.reponse.statut ||
    'En attente'
}

function statutClasses(demande) {
  if (!demande.reponse) {
    return 'bg-[#F2F3F0] text-[#1A1C1A]'
  }

  const statut = demande.reponse.statut

  if (
    statut === 'ACCEPTE' ||
    statut === 'ACCEPTEE'
  ) {
    return 'bg-[#2D6A4F] text-[#FAFAF8]'
  }

  if (
    statut === 'REFUSE' ||
    statut === 'REFUSEE'
  ) {
    return 'bg-[#FEE2E2] text-[#991B1B]'
  }

  if (
    statut === 'EXPIRE' ||
    statut === 'EXPIREE'
  ) {
    return 'bg-[#F1F5F9] text-[#64748B]'
  }

  return 'bg-[#F2F3F0] text-[#1A1C1A]'
}
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="flex w-full flex-col">

      <main
        class="mx-auto flex w-full max-w-[1440px] flex-col gap-7  py-8 sm:px-8 lg:px-10"
      >

        <!-- Introduction -->
        <section
          class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="flex flex-col gap-2">
            <h1
              class="font-serif text-4xl font-normal leading-none tracking-[0.28px] text-[#1A1C1A] sm:text-5xl"
            >
              Devis
            </h1>

            <p class="text-base leading-6 text-[#1A1C1A]/60">
              Gérez les devis envoyés à vos clients.
            </p>
          </div>
        </section>

        <!-- Onglets -->
        <nav
          class="flex w-full items-center gap-6 overflow-x-auto border-b border-[#E5E7E2]"
          aria-label="Filtres des devis"
        >
          <button
            type="button"
            class="shrink-0 border-b-2 px-0 pb-3.5 pt-1.5 text-sm leading-[21px] transition"
            :class="
              activeTab === 'TOUS'
                ? 'border-[#2D6A4F] font-bold text-[#1A1C1A]'
                : 'border-transparent font-medium text-[#1A1C1A]/40 hover:text-[#1A1C1A]/70'
            "
            @click="changerOnglet('TOUS')"
          >
            Tous ({{ nombreTous }})
          </button>

          <button
            type="button"
            class="shrink-0 border-b-2 px-0 pb-3.5 pt-1.5 text-sm leading-[21px] transition"
            :class="
              activeTab === 'EN_ATTENTE'
                ? 'border-[#2D6A4F] font-bold text-[#1A1C1A]'
                : 'border-transparent font-medium text-[#1A1C1A]/40 hover:text-[#1A1C1A]/70'
            "
            @click="changerOnglet('EN_ATTENTE')"
          >
            En attente ({{ nombreEnAttente }})
          </button>

          <button
            type="button"
            class="shrink-0 border-b-2 px-0 pb-3.5 pt-1.5 text-sm leading-[21px] transition"
            :class="
              activeTab === 'ACCEPTE'
                ? 'border-[#2D6A4F] font-bold text-[#1A1C1A]'
                : 'border-transparent font-medium text-[#1A1C1A]/40 hover:text-[#1A1C1A]/70'
            "
            @click="changerOnglet('ACCEPTE')"
          >
            Acceptés ({{ nombreAcceptes }})
          </button>

          <button
            type="button"
            class="shrink-0 border-b-2 px-0 pb-3.5 pt-1.5 text-sm leading-[21px] transition"
            :class="
              activeTab === 'REFUSE'
                ? 'border-[#2D6A4F] font-bold text-[#1A1C1A]'
                : 'border-transparent font-medium text-[#1A1C1A]/40 hover:text-[#1A1C1A]/70'
            "
            @click="changerOnglet('REFUSE')"
          >
            Refusés ({{ nombreRefuses }})
          </button>

          <button
            type="button"
            class="shrink-0 border-b-2 px-0 pb-3.5 pt-1.5 text-sm leading-[21px] transition"
            :class="
              activeTab === 'EXPIRE'
                ? 'border-[#2D6A4F] font-bold text-[#1A1C1A]'
                : 'border-transparent font-medium text-[#1A1C1A]/40 hover:text-[#1A1C1A]/70'
            "
            @click="changerOnglet('EXPIRE')"
          >
            Expirés ({{ nombreExpires }})
          </button>
        </nav>

        <!-- Chargement -->
        <div
          v-if="isLoading"
          class="flex min-h-[300px] items-center justify-center bg-[#FAFAF8] p-8"
        >
          <p class="text-sm text-[#1A1C1A]/60">
            Chargement des devis...
          </p>
        </div>

        <!-- Erreur -->
        <div
          v-else-if="errorMessage"
          class="flex flex-col items-center justify-center gap-4 bg-[#FAFAF8] p-10 text-center"
        >
          <p class="text-sm text-[#A85148]">
            {{ errorMessage }}
          </p>

          <button
            type="button"
            class="bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24573F]"
            @click="chargerDevis"
          >
            Réessayer
          </button>
        </div>

        <!-- Aucun devis -->
        <EmptyState
          v-else-if="!demandes.length"
          title="Aucun devis"
          message="Les demandes de devis adressées à vos services apparaîtront ici."
        />

        <!-- Aucun résultat du filtre -->
        <div
          v-else-if="!demandesPage.length"
          class="flex min-h-[280px] items-center justify-center bg-[#FAFAF8] p-8 text-center"
        >
          <div>
            <p class="text-base font-medium text-[#1A1C1A]">
              Aucun devis dans cette catégorie
            </p>

            <p class="mt-2 text-sm text-[#1A1C1A]/60">
              Aucun devis ne correspond actuellement à ce filtre.
            </p>
          </div>
        </div>

        <!-- Liste -->
        <section
          v-else
          class="flex flex-col gap-0"
        >
          <article
            v-for="demande in demandesPage"
            :key="demande.id"
            class="flex flex-col gap-6 border border-[#E5E7E2] bg-[#FAFAF8] p-6 sm:p-8"
          >
            <!-- Client + statut -->
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="flex min-w-0 items-center gap-3">
                <!-- Avatar avec initiales -->
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white text-sm font-medium text-[#2D6A4F]"
                >
                  {{
                    (
                      demande.client_nom ||
                      'Client'
                    )
                      .split(' ')
                      .map((part) => part.charAt(0))
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  }}
                </div>

                <div class="min-w-0">
                  <p
                    class="truncate text-base font-medium leading-6 text-[#1A1C1A]"
                  >
                    {{ demande.client_nom || 'Client' }}
                  </p>

                  <p
                    class="truncate text-sm leading-[21px] text-[#1A1C1A]/60"
                  >
                    {{
                      demande.service_nom ||
                      'Service non renseigné'
                    }}
                  </p>
                </div>
              </div>

              <span
                class="w-fit shrink-0 px-3 py-1 text-[10px] font-bold uppercase leading-[15px]"
                :class="statutClasses(demande)"
              >
                {{ statutLabel(demande) }}
              </span>
            </div>

            <!-- Montant + date + action -->
            <div
              class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
            >
              <!-- Montant -->
              <div class="flex flex-col gap-1">
                <p
                  class="text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-[#1A1C1A]/40"
                >
                  Montant
                </p>

                <div class="flex items-baseline gap-2">
                  <span
                    class="text-2xl font-normal leading-9 text-[#1A1C1A]"
                  >
                    {{
                      formatMontant(
                        demande.reponse?.prix_propose ||
                        demande.budget_estime,
                      )
                    }}
                  </span>

                  <span
                    class="text-sm leading-[21px] tracking-[0.22px] text-[#1A1C1A]"
                  >
                    FCFA
                  </span>
                </div>
              </div>

              <!-- Date + bouton -->
              <div
                class="flex flex-col items-start gap-4 sm:items-end"
              >
                <p
                  class="text-xs leading-[18px] text-[#1A1C1A]/40"
                >
                  Envoyé le
                  {{ formatDate(demande.date_creation) }}
                </p>

                <button
                  type="button"
                  class="border-b-2 border-[#1A1C1A] pb-0.5 text-center text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-[#1A1C1A] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  @click="ouvrirReponse(demande)"
                >
                  {{
                    demande.reponse
                      ? 'Voir le devis'
                      : 'Répondre'
                  }}
                </button>
              </div>
            </div>

            <!-- Informations supplémentaires -->
            <div
              v-if="demande.description"
              class="border-t border-[#E5E7E2] pt-5"
            >
              <p
                class="line-clamp-2 text-sm leading-6 text-[#1A1C1A]/60"
              >
                {{ demande.description }}
              </p>
            </div>
          </article>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#E5E7E2] pt-6 sm:flex-row"
          >
            <p class="text-sm text-[#1A1C1A]/50">
              Page {{ currentPage }} sur {{ totalPages }}
            </p>

            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="currentPage === 1"
                class="flex h-9 w-9 items-center justify-center border border-[#E5E7E2] bg-[#FAFAF8] text-[#1A1C1A] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Page précédente"
                @click="pagePrecedente"
              >
                <ChevronLeft :size="16" />
              </button>

              <button
                v-for="page in pages"
                :key="page"
                type="button"
                class="flex h-9 min-w-9 items-center justify-center border px-3 text-sm transition"
                :class="
                  page === currentPage
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] font-bold text-white'
                    : 'border-[#E5E7E2] bg-[#FAFAF8] text-[#1A1C1A] hover:border-[#2D6A4F] hover:text-[#2D6A4F]'
                "
                @click="allerPage(page)"
              >
                {{ page }}
              </button>

              <button
                type="button"
                :disabled="currentPage === totalPages"
                class="flex h-9 w-9 items-center justify-center border border-[#E5E7E2] bg-[#FAFAF8] text-[#1A1C1A] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Page suivante"
                @click="pageSuivante"
              >
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <!-- Modal réponse -->
      <div
        v-if="showResponseModal && selectedDemande"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#051F20]/40 p-4"
        @click.self="fermerReponse"
      >
        <div
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-[#FAFAF8] p-6 sm:p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p
                class="text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A]/40"
              >
                Répondre au devis
              </p>

              <h2
                class="mt-2 font-serif text-3xl text-[#1A1C1A]"
              >
                {{
                  selectedDemande.service_nom ||
                  'Service demandé'
                }}
              </h2>

              <p class="mt-1 text-sm text-[#1A1C1A]/60">
                Client :
                {{ selectedDemande.client_nom || 'Client' }}
              </p>
            </div>

            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center text-[#1A1C1A]/60 transition hover:bg-[#F2F3F0] hover:text-[#1A1C1A]"
              aria-label="Fermer"
              @click="fermerReponse"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Devis déjà envoyé : montants tels que calculés par le backend -->
          <div v-if="selectedDemande.reponse" class="mt-8 grid gap-3">
            <p class="text-sm font-bold text-[#16805B]">
              Devis envoyé
              <span v-if="selectedDemande.reponse.statut === 'ACCEPTEE'"> · accepté par le client</span>
              <span v-else-if="selectedDemande.reponse.statut === 'REFUSEE'" class="text-[#A85148]"> · refusé par le client</span>
            </p>
            <p
              v-if="selectedDemande.reponse.statut === 'ACCEPTEE'"
              class="bg-[#EAF8F2] p-3 text-sm text-[#16805B]"
            >
              {{
                selectedDemande.reponse.paiement?.statut === 'REUSSI'
                  ? 'Paiement reçu et sécurisé : la prestation est à réaliser (voir « Demandes »).'
                  : 'En attente du paiement du client.'
              }}
            </p>
            <DevisDetail :reponse="selectedDemande.reponse" :service="selectedDemande.service_nom" />
          </div>

          <!-- Formulaire de devis détaillé -->
          <form
            v-else
            class="mt-8 grid gap-6"
            @submit.prevent="envoyerReponse"
          >
            <!-- Matériaux -->
            <fieldset class="grid gap-3">
              <legend class="text-xs font-bold uppercase tracking-[1.2px] text-[#1A1C1A]/60">
                Matériaux (prix estimés)
              </legend>

              <p v-if="!form.lignes.length" class="text-sm text-[#1A1C1A]/60">
                Aucun matériau : ajoutez-en si la prestation en nécessite.
              </p>

              <div
                v-for="(ligne, index) in form.lignes"
                :key="index"
                class="grid gap-2 border border-[#E5E7E2] bg-white p-3 sm:grid-cols-[1fr_72px_72px_110px_36px] sm:items-end"
              >
                <label class="grid gap-1 text-xs font-bold text-[#1A1C1A]/70">
                  Désignation
                  <input v-model="ligne.designation" type="text" maxlength="200" required placeholder="Ex. Robinet mitigeur" class="w-full border border-[#E5E7E2] px-3 py-2 text-sm font-normal text-[#1A1C1A] outline-none focus:border-[#2D6A4F]" />
                </label>
                <div class="grid grid-cols-3 gap-2 sm:contents">
                  <label class="grid gap-1 text-xs font-bold text-[#1A1C1A]/70">
                    Qté
                    <input v-model="ligne.quantite" type="number" min="0.01" step="0.01" required class="w-full border border-[#E5E7E2] px-2 py-2 text-sm font-normal text-[#1A1C1A] outline-none focus:border-[#2D6A4F]" />
                  </label>
                  <label class="grid gap-1 text-xs font-bold text-[#1A1C1A]/70">
                    Unité
                    <input v-model="ligne.unite" type="text" maxlength="30" placeholder="m, sac…" class="w-full border border-[#E5E7E2] px-2 py-2 text-sm font-normal text-[#1A1C1A] outline-none focus:border-[#2D6A4F]" />
                  </label>
                  <label class="grid gap-1 text-xs font-bold text-[#1A1C1A]/70">
                    Prix unit. (FCFA)
                    <input v-model="ligne.prix_unitaire" type="number" min="0" step="1" required class="w-full border border-[#E5E7E2] px-2 py-2 text-sm font-normal text-[#1A1C1A] outline-none focus:border-[#2D6A4F]" />
                  </label>
                </div>
                <button
                  type="button"
                  class="flex h-9 w-full items-center justify-center gap-1 text-xs font-bold text-[#A85148] transition hover:bg-[#FFF0EE] sm:w-9"
                  :aria-label="`Retirer ${ligne.designation || 'ce matériau'}`"
                  @click="retirerLigne(index)"
                >
                  <Trash2 :size="16" />
                  <span class="sm:hidden">Retirer</span>
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 justify-self-start border border-dashed border-[#2D6A4F] px-4 py-2.5 text-sm font-bold text-[#2D6A4F] transition hover:bg-[#EAF8F2]"
                @click="ajouterLigne"
              >
                <Plus :size="16" />
                Ajouter un matériau
              </button>
            </fieldset>

            <div class="grid gap-5 sm:grid-cols-2">
              <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
                Main-d'œuvre (FCFA)
                <input v-model="form.montant_main_oeuvre" type="number" min="0" step="1" required class="w-full border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
              </label>

              <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
                Autres frais (FCFA)
                <input v-model="form.montant_frais" type="number" min="0" step="1" placeholder="0" class="w-full border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
              </label>

              <label v-if="Number(form.montant_frais) > 0" class="grid gap-2 text-sm font-bold text-[#1A1C1A] sm:col-span-2">
                Nature des frais
                <input v-model="form.description_frais" type="text" maxlength="255" placeholder="Ex. déplacement, location de matériel" class="w-full border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
              </label>

              <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
                Délai estimé (jours)
                <input v-model="form.delai_estime" type="number" min="1" step="1" required class="w-full border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
              </label>

              <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
                Devis valable jusqu'au
                <input v-model="form.date_validite" type="date" :min="dateMinValidite" class="w-full border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
              </label>
            </div>

            <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
              Précisions
              <textarea v-model="form.description" rows="3" placeholder="Ce qui est inclus dans votre proposition." class="w-full resize-none border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition placeholder:text-[#1A1C1A]/30 focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
            </label>

            <label class="grid gap-2 text-sm font-bold text-[#1A1C1A]">
              Conditions (facultatif)
              <textarea v-model="form.conditions" rows="2" placeholder="Garantie, exclusions…" class="w-full resize-none border border-[#E5E7E2] bg-white px-4 py-3 font-normal text-[#1A1C1A] outline-none transition placeholder:text-[#1A1C1A]/30 focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10" />
            </label>

            <div class="flex items-center justify-between gap-3 bg-[#EAF8F2] px-4 py-3">
              <span class="text-xs font-bold uppercase tracking-[1.2px] text-[#2D6A4F]">Total estimé</span>
              <span class="font-serif text-2xl text-[#2D6A4F]">{{ formatMontant(apercuTotal) }} FCFA</span>
            </div>
            <p class="-mt-4 text-xs text-[#1A1C1A]/50">Le total définitif est calculé par MIMOSY à l'envoi : c'est le montant que le client paiera.</p>

            <p
              v-if="errorMessage"
              class="bg-[#FFF0EE] p-3 text-sm text-[#A85148]"
            >
              {{ errorMessage }}
            </p>

            <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="border border-[#E5E7E2] px-5 py-3 text-sm font-bold text-[#1A1C1A] transition hover:bg-[#F2F3F0]"
                :disabled="isSubmitting"
                @click="fermerReponse"
              >
                Annuler
              </button>

              <button
                type="submit"
                :disabled="isSubmitting"
                class="inline-flex items-center justify-center gap-2 bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24573F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send
                  v-if="!isSubmitting"
                  :size="16"
                />

                {{
                  isSubmitting
                    ? 'Envoi...'
                    : 'Envoyer le devis'
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>