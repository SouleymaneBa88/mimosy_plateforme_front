<script setup>
/**
 * PrestataireProfile.vue
 * ------------------------------------------------------------------
 * Page de profil public d'un prestataire de services.
 *
 * Disposition reprise de
 * front_mimosy/src/views/clients/DetailsPrestataire.vue (fil d'ariane,
 * en-tête avec photo/nom/badges, sections À propos / Services / Avis,
 * colonne latérale avec disponibilités et localisation) — la logique
 * ci-dessous n'a pas changé : demande de prestation, demande de devis et
 * prise de rendez-vous restent les vraies actions connectées à l'API
 * MIMOSY (aucune de ces trois actions n'existe dans front_mimosy).
 * ------------------------------------------------------------------
 */

// Outils Vue, routeur et icônes.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  MapPin,
  Sparkles,
  Star,
  X,
} from 'lucide-vue-next'

// La mise en page, les stores et les appels à l'API.
import ClientLayout from '@/components/layout/ClientLayout.vue'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'
import { useRendezVousStore } from '@/stores/rendezVous'
import * as devisService from '@/services/devisService'
import * as rendezVousService from '@/services/rendezVousService'

// La route (pour lire l'id du prestataire), le routeur et les stores.
const route = useRoute()
const router = useRouter()
const prestataireStore = usePrestataireStore()
const demandeStore = useDemandePrestationStore()
const rendezVousStore = useRendezVousStore()

/* ---------------------------------------------------------------- *
 * État local des trois modales (prestation / devis / rendez-vous)
 * ---------------------------------------------------------------- */
const demandeModalOpen = ref(false)
const devisModalOpen = ref(false)
const rendezVousModalOpen = ref(false)
const demandeEnvoyee = ref(false)
const devisEnvoye = ref(false)
const devisError = ref('')
const devisLoading = ref(false)
const rendezVousEnvoye = ref(false)
const rendezVousError = ref('')
const rendezVousLoading = ref(false)

// Les valeurs des formulaires "demande de prestation" et "demande de devis".
const demandeForm = reactive({ service: '', description: '', date_souhaitee: '', budget: '' })
const devisForm = reactive({ service: '', description: '', date_souhaitee: '', budget_estime: '' })

/* ---------------------------------------------------------------- *
 * Prise de rendez-vous : date choisie -> créneaux calculés par
 * le backend (jamais recalculés côté frontend) -> créneau choisi.
 * ---------------------------------------------------------------- */
const rendezVousForm = reactive({ service: '', date: '', creneau: null, notes: '' })
// Les créneaux libres proposés par le serveur pour la date choisie, et leur chargement.
const creneauxDisponibles = ref([])
const creneauxLoading = ref(false)
const creneauxError = ref('')

// Met une heure au format "14:30".
function formaterHeure(isoString) {
  return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Charge les créneaux libres du prestataire pour la date choisie.
async function chargerCreneaux() {
  creneauxDisponibles.value = []
  rendezVousForm.creneau = null
  creneauxError.value = ''

  if (!rendezVousForm.date || !prestataire.value?.id) return

  creneauxLoading.value = true
  try {
    creneauxDisponibles.value = await rendezVousService.listCreneauxDisponibles(
      prestataire.value.id,
      rendezVousForm.date,
    )
  } catch (error) {
    creneauxError.value = error.message
  } finally {
    creneauxLoading.value = false
  }
}

/* ---------------------------------------------------------------- *
 * Propriétés calculées dérivées du prestataire chargé
 * ---------------------------------------------------------------- */

// Le prestataire actuellement sélectionné dans le store.
const prestataire = computed(() => prestataireStore.prestataireSelectionne)

// Offres de service proposées par ce prestataire.
const services = computed(() => prestataire.value?.services || [])

// Offres réellement réservables (utilisées dans les deux formulaires).
const servicesDisponibles = computed(() => services.value.filter((offer) => offer.disponible))

// Catégories uniques déduites des offres (dédupliquées par id).
const categories = computed(() => {
  const unique = new Map()
  services.value.forEach((offer) => {
    if (offer.service?.categorie) unique.set(offer.service.categorie.id, offer.service.categorie)
  })
  return [...unique.values()]
})

// Compétences uniques déduites des offres (dédupliquées par id).
const competences = computed(() => {
  const unique = new Map()
  services.value.forEach((offer) => {
    offer.competences?.forEach((competence) => unique.set(competence.id, competence))
  })
  return [...unique.values()]
})

// Nom affiché : "Prénom Nom", avec repli sur "Prestataire".
const displayName = computed(
  () => [prestataire.value?.user_first_name, prestataire.value?.user_last_name].filter(Boolean).join(' ') || 'Prestataire',
)

// true pendant le chargement du prestataire.
const isLoading = computed(() => prestataireStore.isLoading)

// Une modale est-elle ouverte ? (sert au verrouillage du défilement)
const anyModalOpen = computed(() => demandeModalOpen.value || devisModalOpen.value || rendezVousModalOpen.value)

/* ---------------------------------------------------------------- *
 * Confort d'utilisation des modales
 *  - blocage du défilement de la page en arrière-plan
 *  - fermeture à la touche Échap
 * ---------------------------------------------------------------- */
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// Touche Échap : ferme la fenêtre ouverte.
function onKeydown(event) {
  if (event.key !== 'Escape') return
  if (devisModalOpen.value) fermerDevisModal()
  else if (rendezVousModalOpen.value) fermerRendezVousModal()
  else if (demandeModalOpen.value) fermerDemandeModal()
}

/* ---------------------------------------------------------------- *
 * Cycle de vie : chargement du prestataire depuis l'URL
 * ---------------------------------------------------------------- */
onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  try {
    await prestataireStore.chargerPrestataire(route.params.id)
    // Support du paramètre ?refaire=true pour rouvrir directement
    // la modale de demande (ex. depuis un lien "refaire une demande").
    if (route.query.refaire === 'true') demanderPrestation()
  } catch {
    // L'erreur est affichée par l'état du store.
  }
})

// En quittant la page : on arrête d'écouter le clavier et on débloque le défilement.
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

/* ---------------------------------------------------------------- *
 * Navigation
 * ---------------------------------------------------------------- */
function retourListe() {
  router.push({ name: 'client-home' })
}

/* ---------------------------------------------------------------- *
 * Modale "Demander une prestation"
 * ---------------------------------------------------------------- */
function demanderPrestation() {
  demandeEnvoyee.value = false
  demandeStore.errorMessage = ''
  // Pré-sélectionne le premier service disponible pour accélérer la saisie.
  demandeForm.service = servicesDisponibles.value[0]?.service?.id || ''
  demandeModalOpen.value = true
}

// Envoie la demande de prestation (tous les champs sont obligatoires).
async function envoyerDemande() {
  if (!prestataire.value?.id || !demandeForm.service || !demandeForm.description.trim() || !demandeForm.date_souhaitee || !demandeForm.budget) {
    demandeStore.errorMessage = 'Veuillez renseigner tous les champs de la demande.'
    return
  }

  try {
    await demandeStore.creerDemande({
      prestataire: prestataire.value.id,
      service: demandeForm.service,
      description: demandeForm.description.trim(),
      date_souhaitee: new Date(demandeForm.date_souhaitee).toISOString(),
      budget: demandeForm.budget,
    })
    demandeEnvoyee.value = true
    demandeForm.service = ''
    demandeForm.description = ''
    demandeForm.date_souhaitee = ''
    demandeForm.budget = ''
  } catch {
    // L'erreur détaillée reste disponible dans le store.
  }
}

// Ferme la fenêtre de demande.
function fermerDemandeModal() {
  demandeModalOpen.value = false
  demandeStore.errorMessage = ''
}

/* ---------------------------------------------------------------- *
 * Modale "Demander un devis"
 * ---------------------------------------------------------------- */
function demanderDevis() {
  devisEnvoye.value = false
  devisError.value = ''
  devisForm.service = servicesDisponibles.value[0]?.service?.id || ''
  devisModalOpen.value = true
}

// Envoie la demande de devis.
async function envoyerDevis() {
  if (!prestataire.value?.id || !devisForm.service || !devisForm.description.trim() || !devisForm.date_souhaitee || !devisForm.budget_estime) {
    devisError.value = 'Veuillez renseigner tous les champs de la demande de devis.'
    return
  }

  devisLoading.value = true
  devisError.value = ''
  try {
    await devisService.createQuoteRequest({
      prestataire: prestataire.value.id,
      service: devisForm.service,
      description: devisForm.description.trim(),
      date_souhaitee: new Date(devisForm.date_souhaitee).toISOString(),
      budget_estime: devisForm.budget_estime,
    })
    devisEnvoye.value = true
    devisForm.service = ''
    devisForm.description = ''
    devisForm.date_souhaitee = ''
    devisForm.budget_estime = ''
  } catch (error) {
    devisError.value = error.message
  } finally {
    devisLoading.value = false
  }
}

// Ferme la fenêtre de devis.
function fermerDevisModal() {
  devisModalOpen.value = false
  devisError.value = ''
}

/* ---------------------------------------------------------------- *
 * Modale "Prendre rendez-vous"
 * ---------------------------------------------------------------- */
function prendreRendezVous() {
  rendezVousEnvoye.value = false
  rendezVousError.value = ''
  rendezVousForm.service = servicesDisponibles.value[0]?.service?.id || ''
  rendezVousForm.date = ''
  rendezVousForm.creneau = null
  rendezVousForm.notes = ''
  creneauxDisponibles.value = []
  rendezVousModalOpen.value = true
}

// Envoie la demande de rendez-vous sur le créneau choisi.
async function envoyerRendezVous() {
  if (!prestataire.value?.id || !rendezVousForm.service || !rendezVousForm.creneau) {
    rendezVousError.value = 'Veuillez choisir un service et un créneau disponible.'
    return
  }

  rendezVousLoading.value = true
  rendezVousError.value = ''
  try {
    await rendezVousStore.creerRendezVous({
      prestataire: prestataire.value.id,
      service: rendezVousForm.service,
      date_heure_debut: rendezVousForm.creneau.heure_debut,
      date_heure_fin: rendezVousForm.creneau.heure_fin,
      notes: rendezVousForm.notes.trim(),
    })
    rendezVousEnvoye.value = true
  } catch (error) {
    rendezVousError.value = error.message
  } finally {
    rendezVousLoading.value = false
  }
}

// Ferme la fenêtre de rendez-vous.
function fermerRendezVousModal() {
  rendezVousModalOpen.value = false
  rendezVousError.value = ''
}

// Quand la date du rendez-vous change, on recharge les créneaux libres.
watch(() => rendezVousForm.date, chargerCreneaux)
</script>

<template>
  <ClientLayout>
    <section class="mx-auto w-full max-w-[100%] px-4 py-10 sm:px-8 sm:py-12">
      <!-- États globaux : chargement / erreur -->
      <div v-if="isLoading" class="flex items-center justify-center gap-2.5 rounded-2xl border border-mimosy-border bg-mimosy-surface p-12 font-sans text-sm text-mimosy-secondary">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-mimosy-border border-t-mimosy-primary" />
        Chargement du profil…
      </div>

      <div v-else-if="prestataireStore.errorMessage" class="rounded-2xl border border-[#a85148] bg-[#fbeeec] p-8 text-center font-sans text-sm text-[#a85148]">
        {{ prestataireStore.errorMessage }}
      </div>

      <template v-else-if="prestataire">
        <!-- Fil d'ariane -->
        <button type="button" class="flex items-center gap-1.5 font-sans text-sm font-medium text-mimosy-secondary transition hover:text-mimosy-text" @click="retourListe">
          <ArrowLeft :size="16" :stroke-width="1.8" />
          Retour aux prestataires
        </button>

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <!-- En-tête prestataire (repris de front_mimosy/EnTetePrestataireDetail.vue) -->
            <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <img
                    v-if="prestataire.photo"
                    :src="prestataire.photo"
                    :alt="`Photo de ${displayName}`"
                    class="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                  />
                  <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-mimosy-primaryBg font-serif text-4xl text-mimosy-primary sm:h-28 sm:w-28">
                    {{ displayName.charAt(0) }}
                  </div>

                  <div class="flex min-w-0 flex-col gap-2.5">
                    <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px] sm:leading-[38px]">{{ displayName }}</h1>
                    <p class="font-sans text-sm font-medium text-mimosy-secondary">
                      {{ prestataire.description || 'Prestataire MIMOSY' }}
                    </p>

                    <div class="flex flex-wrap items-center gap-2">
                      <span v-if="prestataire.statut_verification === 'VERIFIE'" class="flex items-center gap-1.5 rounded-full bg-mimosy-primaryBg px-2.5 py-1">
                        <BadgeCheck :size="12" :stroke-width="2" class="text-mimosy-primary" />
                        <span class="font-sans text-[10px] font-bold uppercase leading-[15px] text-mimosy-primary">Vérifié</span>
                      </span>
                      <span
                        class="rounded-full px-2.5 py-1 font-sans text-[10px] font-bold uppercase leading-[15px]"
                        :class="prestataire.disponibilite ? 'bg-mimosy-page text-mimosy-primary' : 'bg-mimosy-grayBg text-mimosy-secondary'"
                      >
                        {{ prestataire.disponibilite ? 'Disponible' : 'Indisponible' }}
                      </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-mimosy-secondary">
                      <span class="flex items-center gap-1.5">
                        <Clock3 :size="13" :stroke-width="1.8" />
                        {{ prestataire.experience }} an(s) d'expérience
                      </span>
                      <span class="flex items-center gap-1.5">
                        <MapPin :size="13" :stroke-width="1.8" />
                        Localisation non renseignée
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                  <button type="button" class="w-full rounded-xl bg-mimosy-primary px-6 py-3 font-sans text-sm font-bold text-white transition hover:opacity-90 sm:w-auto" @click="demanderPrestation">
                    Demander une prestation
                  </button>
                </div>
              </div>
            </div>

            <!-- À propos -->
            <section v-if="prestataire.description" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <h2 class="font-serif text-2xl text-mimosy-text">À propos</h2>
              <p class="mt-4 font-sans text-sm leading-relaxed text-mimosy-secondary">{{ prestataire.description }}</p>
            </section>

            <!-- Services et tarifs -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <div class="flex items-center justify-between gap-3">
                <h2 class="font-serif text-2xl text-mimosy-text">Services et tarifs</h2>
                <span v-if="services.length" class="flex h-6 min-w-6 items-center justify-center rounded-full bg-mimosy-primaryBg px-2 font-sans text-xs font-bold text-mimosy-primary">{{ services.length }}</span>
              </div>

              <div v-if="services.length" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-for="offer in services" :key="offer.id" class="flex items-start justify-between gap-3 rounded-2xl border border-mimosy-border p-4 transition hover:border-mimosy-primary/40">
                  <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="font-sans text-sm font-bold leading-snug text-mimosy-text">{{ offer.service?.nom }}</span>
                    <span class="font-sans text-xs leading-snug text-mimosy-secondary">{{ offer.description || offer.service?.description || 'Aucune description disponible.' }}</span>
                    <span class="mt-1 font-sans text-[10px] font-bold uppercase" :class="offer.disponible ? 'text-mimosy-primary' : 'text-mimosy-secondary'">
                      {{ offer.disponible ? 'Disponible' : 'Indisponible' }}
                    </span>
                  </div>
                  <span class="shrink-0 whitespace-nowrap font-sans text-sm font-bold text-mimosy-text">
                    {{ Number(offer.prix).toLocaleString('fr-FR') }} FCFA<span class="font-normal text-mimosy-secondary"> / {{ offer.unite }}</span>
                  </span>
                </div>
              </div>
              <p v-else class="mt-5 font-sans text-sm text-mimosy-secondary">Aucun service disponible.</p>
            </section>

            <!-- Compétences -->
            <section v-if="competences.length" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <h2 class="font-serif text-2xl text-mimosy-text">Compétences</h2>
              <div class="mt-5 flex flex-wrap gap-2">
                <span v-for="competence in competences" :key="competence.id" class="flex items-center gap-1.5 rounded-full border border-mimosy-border bg-mimosy-page px-3.5 py-1.5 font-sans text-xs font-bold text-mimosy-text">
                  <Sparkles :size="12" :stroke-width="2" class="text-mimosy-primary" />
                  {{ competence.nom }}
                </span>
              </div>
            </section>

            <!-- Avis -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="font-serif text-2xl text-mimosy-text">Avis clients</h2>
              </div>
              <p class="mt-5 font-sans text-sm text-mimosy-secondary">Aucun avis pour le moment.</p>
            </section>
          </div>

          <!-- Colonne latérale -->
          <div class="flex flex-col gap-6">
            <!-- Actions -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <p class="font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-mimosy-secondary">Travailler avec {{ displayName }}</p>
              <div class="mt-3 flex flex-col gap-2.5">
                <!-- <button type="button" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="demanderPrestation">
                  Demander une prestation
                </button> -->
                <button type="button" class="rounded-xl border bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="demanderDevis">
                  Demander un devis
                </button>
                <button type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="prendreRendezVous">
                  Prendre rendez-vous
                </button>
              </div>
              <p class="mt-3 text-center font-sans text-xs text-mimosy-secondary">Réponse directe du prestataire. Aucun engagement avant validation.</p>
            </section>

            <!-- Disponibilités -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Disponibilité</h2>
              <p class="mt-4 flex items-center gap-2 font-sans text-sm font-bold" :class="prestataire.disponibilite ? 'text-mimosy-primary' : 'text-mimosy-secondary'">
                <span class="h-2 w-2 rounded-full" :class="prestataire.disponibilite ? 'bg-mimosy-primary' : 'bg-mimosy-secondary'" />
                {{ prestataire.disponibilite ? 'Disponible actuellement' : 'Indisponible actuellement' }}
              </p>
            </section>

            <!-- Catégories -->
            <section v-if="categories.length" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Catégories</h2>
              <ul class="mt-4 flex flex-col gap-2.5">
                <li v-for="category in categories" :key="category.id" class="flex items-center gap-3 rounded-xl border border-mimosy-border p-2.5">
                  <img v-if="category.image" :src="category.image" :alt="category.nom" class="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  <div v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mimosy-primary font-serif text-mimosy-surface">{{ category.nom?.charAt(0) }}</div>
                  <div class="min-w-0">
                    <p class="truncate font-sans text-sm font-bold text-mimosy-text">{{ category.nom }}</p>
                  </div>
                </li>
              </ul>
            </section>

            <!-- Localisation -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Localisation</h2>
              <p class="mt-4 flex items-center gap-2 font-sans text-sm text-mimosy-secondary">
                <MapPin :size="16" :stroke-width="1.8" />
                Localisation non renseignée.
              </p>
            </section>
          </div>
        </div>
      </template>

      <div v-else class="rounded-2xl border border-dashed border-mimosy-border bg-mimosy-surface p-12 text-center font-sans text-sm text-mimosy-secondary">
        Profil introuvable.
      </div>
    </section>

    <!-- Modales (téléportées dans <body>) -->
    <Teleport to="body">
      <!-- Modale : Demander une prestation -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="demandeModalOpen" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-prestation" @click.self="fermerDemandeModal">
          <form class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-mimosy-surface shadow-xl" @submit.prevent="envoyerDemande">
            <header class="flex items-start justify-between gap-4 border-b border-mimosy-border px-6 py-5">
              <div>
                <h2 id="titre-prestation" class="font-serif text-lg text-mimosy-text">Demander une prestation</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Votre demande sera envoyée à {{ displayName }}.</p>
              </div>
              <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mimosy-secondary transition hover:bg-mimosy-page" aria-label="Fermer" @click="fermerDemandeModal">
                <X :size="16" :stroke-width="2.5" />
              </button>
            </header>

            <div class="overflow-y-auto p-6">
              <div v-if="demandeEnvoyee" class="flex items-center gap-2.5 rounded-xl border border-mimosy-primary bg-mimosy-primaryBg p-4 font-sans text-sm font-bold text-mimosy-primary">
                <BadgeCheck :size="20" :stroke-width="2" />
                Votre demande a été envoyée avec succès.
              </div>

              <div v-else class="grid gap-[1.125rem]">
                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Service</span>
                  <select v-model="demandeForm.service" required class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary">
                    <option value="">Choisir un service</option>
                    <option v-for="offer in servicesDisponibles" :key="offer.id" :value="offer.service?.id">{{ offer.service?.nom }}</option>
                  </select>
                </label>

                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Description</span>
                  <textarea v-model="demandeForm.description" rows="4" required placeholder="Décrivez votre besoin" class="w-full resize-y rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                </label>

                <div class="grid gap-[1.125rem] sm:grid-cols-2">
                  <label class="grid gap-2">
                    <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Date souhaitée</span>
                    <input v-model="demandeForm.date_souhaitee" type="datetime-local" required class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                  </label>
                  <label class="grid gap-2">
                    <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Budget (FCFA)</span>
                    <input v-model="demandeForm.budget" type="number" min="0.01" step="0.01" required placeholder="Ex. 15000" class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                  </label>
                </div>

                <p v-if="demandeStore.errorMessage" class="rounded-lg border border-[#a85148] bg-[#fbeeec] px-3.5 py-3 font-sans text-sm text-[#a85148]">{{ demandeStore.errorMessage }}</p>
              </div>
            </div>

            <footer class="flex justify-end gap-2.5 border-t border-mimosy-border bg-mimosy-page px-6 py-4">
              <button type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="fermerDemandeModal">
                {{ demandeEnvoyee ? 'Fermer' : 'Annuler' }}
              </button>
              <button v-if="!demandeEnvoyee" type="submit" :disabled="demandeStore.isLoading" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-55">
                {{ demandeStore.isLoading ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>

      <!-- Modale : Demander un devis -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="devisModalOpen" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-devis" @click.self="fermerDevisModal">
          <form class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-mimosy-surface shadow-xl" @submit.prevent="envoyerDevis">
            <header class="flex items-start justify-between gap-4 border-b border-mimosy-border px-6 py-5">
              <div>
                <h2 id="titre-devis" class="font-serif text-lg text-mimosy-text">Demander un devis</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Estimation gratuite, sans engagement.</p>
              </div>
              <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mimosy-secondary transition hover:bg-mimosy-page" aria-label="Fermer" @click="fermerDevisModal">
                <X :size="16" :stroke-width="2.5" />
              </button>
            </header>

            <div class="overflow-y-auto p-6">
              <div v-if="devisEnvoye" class="flex items-center gap-2.5 rounded-xl border border-mimosy-primary bg-mimosy-primaryBg p-4 font-sans text-sm font-bold text-mimosy-primary">
                <BadgeCheck :size="20" :stroke-width="2" />
                Votre demande de devis a été envoyée.
              </div>

              <div v-else class="grid gap-[1.125rem]">
                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Service</span>
                  <select v-model="devisForm.service" required class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary">
                    <option value="">Choisir un service</option>
                    <option v-for="offer in servicesDisponibles" :key="offer.id" :value="offer.service?.id">{{ offer.service?.nom }}</option>
                  </select>
                </label>

                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Description</span>
                  <textarea v-model="devisForm.description" rows="4" required placeholder="Décrivez les travaux à chiffrer" class="w-full resize-y rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                </label>

                <div class="grid gap-[1.125rem] sm:grid-cols-2">
                  <label class="grid gap-2">
                    <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Date souhaitée</span>
                    <input v-model="devisForm.date_souhaitee" type="datetime-local" required class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                  </label>
                  <label class="grid gap-2">
                    <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Budget estimé (FCFA)</span>
                    <input v-model="devisForm.budget_estime" type="number" min="0.01" step="0.01" required placeholder="Ex. 25000" class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                  </label>
                </div>

                <p v-if="devisError" class="rounded-lg border border-[#a85148] bg-[#fbeeec] px-3.5 py-3 font-sans text-sm text-[#a85148]">{{ devisError }}</p>
              </div>
            </div>

            <footer class="flex justify-end gap-2.5 border-t border-mimosy-border bg-mimosy-page px-6 py-4">
              <button type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="fermerDevisModal">
                {{ devisEnvoye ? 'Fermer' : 'Annuler' }}
              </button>
              <button v-if="!devisEnvoye" type="submit" :disabled="devisLoading" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-55">
                {{ devisLoading ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>

      <!-- Modale : Prendre rendez-vous -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="rendezVousModalOpen" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 p-4" role="dialog" aria-modal="true" aria-labelledby="titre-rdv" @click.self="fermerRendezVousModal">
          <form class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-mimosy-surface shadow-xl" @submit.prevent="envoyerRendezVous">
            <header class="flex items-start justify-between gap-4 border-b border-mimosy-border px-6 py-5">
              <div>
                <h2 id="titre-rdv" class="font-serif text-lg text-mimosy-text">Prendre rendez-vous</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Choisissez un créneau réellement disponible chez {{ displayName }}.</p>
              </div>
              <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mimosy-secondary transition hover:bg-mimosy-page" aria-label="Fermer" @click="fermerRendezVousModal">
                <X :size="16" :stroke-width="2.5" />
              </button>
            </header>

            <div class="overflow-y-auto p-6">
              <div v-if="rendezVousEnvoye" class="flex items-center gap-2.5 rounded-xl border border-mimosy-primary bg-mimosy-primaryBg p-4 font-sans text-sm font-bold text-mimosy-primary">
                <BadgeCheck :size="20" :stroke-width="2" />
                Votre demande de rendez-vous a été envoyée.
              </div>

              <div v-else class="grid gap-[1.125rem]">
                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Service</span>
                  <select v-model="rendezVousForm.service" required class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary">
                    <option value="">Choisir un service</option>
                    <option v-for="offer in servicesDisponibles" :key="offer.id" :value="offer.service?.id">{{ offer.service?.nom }}</option>
                  </select>
                </label>

                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Date</span>
                  <input v-model="rendezVousForm.date" type="date" required :min="new Date().toISOString().slice(0, 10)" class="w-full rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                </label>

                <div v-if="rendezVousForm.date" class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Créneaux disponibles</span>
                  <p v-if="creneauxLoading" class="font-sans text-sm text-mimosy-secondary">Recherche des créneaux…</p>
                  <p v-else-if="creneauxError" class="font-sans text-sm text-[#a85148]">{{ creneauxError }}</p>
                  <p v-else-if="!creneauxDisponibles.length" class="font-sans text-sm text-mimosy-secondary">Aucun créneau disponible à cette date.</p>
                  <div v-else class="flex flex-wrap gap-2">
                    <button
                      v-for="(creneau, index) in creneauxDisponibles"
                      :key="index"
                      type="button"
                      class="rounded-lg border px-3.5 py-2 font-sans text-sm font-bold transition"
                      :class="rendezVousForm.creneau === creneau ? 'border-mimosy-primary bg-mimosy-primary text-white' : 'border-mimosy-border bg-mimosy-surface text-mimosy-text hover:border-mimosy-primary hover:bg-mimosy-primaryBg'"
                      @click="rendezVousForm.creneau = creneau"
                    >
                      {{ formaterHeure(creneau.heure_debut) }} - {{ formaterHeure(creneau.heure_fin) }}
                    </button>
                  </div>
                </div>

                <label class="grid gap-2">
                  <span class="font-sans text-xs font-bold uppercase tracking-[0.04em] text-mimosy-secondary">Notes (optionnel)</span>
                  <textarea v-model="rendezVousForm.notes" rows="3" placeholder="Précisions utiles pour le prestataire" class="w-full resize-y rounded-lg border border-mimosy-border bg-mimosy-surface px-3.5 py-3 font-sans text-[15px] text-mimosy-text outline-none focus:border-mimosy-primary" />
                </label>

                <p v-if="rendezVousError" class="rounded-lg border border-[#a85148] bg-[#fbeeec] px-3.5 py-3 font-sans text-sm text-[#a85148]">{{ rendezVousError }}</p>
              </div>
            </div>

            <footer class="flex justify-end gap-2.5 border-t border-mimosy-border bg-mimosy-page px-6 py-4">
              <button type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="fermerRendezVousModal">
                {{ rendezVousEnvoye ? 'Fermer' : 'Annuler' }}
              </button>
              <button v-if="!rendezVousEnvoye" type="submit" :disabled="rendezVousLoading || !rendezVousForm.creneau" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-55">
                {{ rendezVousLoading ? 'Envoi…' : 'Confirmer le rendez-vous' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>
    </Teleport>
  </ClientLayout>
</template>
