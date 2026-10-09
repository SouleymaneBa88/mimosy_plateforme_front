<!--
  Page de détail d'un devis envoyé par le prestataire.

  ATTENTION (état actuel du code) : cette page n'est déclarée dans aucune
  route de router/index.js, elle n'est donc pas accessible pour l'instant.
  Les actions "modifier" et "annuler" ne sont pas encore reliées à une
  vraie route / un vrai endpoint (voir les commentaires plus bas).
-->
<script setup>
// Outils Vue, icônes et routeur.
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Pencil,
  XCircle,
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

// Les composants, le store de connexion et les appels à l'API des devis.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'

import { useAuthStore } from '@/stores/auth'
import * as devisService from '@/services/devisService'

// La route (pour lire l'id), le routeur et le store de connexion.
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Le devis, la demande liée, et les états de chargement et d'erreur.
const devis = ref(null)
const demande = ref(null)

const isLoading = ref(false)
const errorMessage = ref('')

// Le nom du prestataire connecté.
const userName = computed(() =>
  [
    authStore.user?.first_name,
    authStore.user?.last_name,
  ]
    .filter(Boolean)
    .join(' ') || 'Prestataire',
)

/* -------------------------------------------------------------------------- */
/* Chargement                                                                 */
/* -------------------------------------------------------------------------- */

// Charge le devis et sa demande depuis le serveur.
async function chargerDevis() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const devisId = route.params.id

    /*
     * On utilise d'abord le service de détail s'il existe.
     * Si ton devisService possède déjà une méthode getQuoteResponse(),
     * elle sera utilisée ici.
     */
    if (typeof devisService.getQuoteResponse === 'function') {
      devis.value = await devisService.getQuoteResponse(devisId)
    } else {
      /*
       * Fallback avec les données déjà disponibles dans le service.
       * Cela évite d'inventer une nouvelle route frontend.
       */
      const data = await devisService.listQuoteResponses()

      const liste = Array.isArray(data)
        ? data
        : data?.results || []

      devis.value = liste.find(
        (item) => String(item.id) === String(devisId),
      )
    }

    if (!devis.value) {
      throw new Error('Devis introuvable.')
    }

    /*
     * Certaines API renvoient directement la demande dans le devis.
     * Si ce n'est pas le cas, on essaie de la retrouver.
     */
    if (devis.value.demande_detail) {
      demande.value = devis.value.demande_detail
    } else if (devis.value.demande_data) {
      demande.value = devis.value.demande_data
    } else if (
      typeof devisService.listQuoteRequests === 'function'
    ) {
      const demandesData =
        await devisService.listQuoteRequests()

      const demandes = Array.isArray(demandesData)
        ? demandesData
        : demandesData?.results || []

      demande.value = demandes.find(
        (item) =>
          String(item.id) ===
          String(devis.value.demande),
      ) || null
    }
  } catch (error) {
    errorMessage.value =
      error?.message || 'Impossible de charger le devis.'
  } finally {
    isLoading.value = false
  }
}

// On charge au montage.
onMounted(() => {
  chargerDevis()
})

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

// Retour à la liste des devis.
function retourAuxDevis() {
  router.push('/prestataire/devis')
}

/* -------------------------------------------------------------------------- */
/* Données calculées                                                          */
/* -------------------------------------------------------------------------- */

// Les informations affichées, en essayant plusieurs noms de champ possibles.
const serviceNom = computed(() =>
  devis.value?.service_nom ||
  demande.value?.service_nom ||
  demande.value?.service?.nom ||
  'Service non renseigné',
)

const clientNom = computed(() =>
  devis.value?.client_nom ||
  demande.value?.client_nom ||
  demande.value?.client?.nom ||
  'Client',
)

const description = computed(() =>
  demande.value?.description ||
  devis.value?.description ||
  'Aucune description fournie.',
)

const dateCreation = computed(() =>
  devis.value?.date_creation ||
  devis.value?.created_at ||
  demande.value?.date_creation ||
  null,
)

const dateSouhaitee = computed(() =>
  demande.value?.date_souhaitee ||
  devis.value?.date_souhaitee ||
  null,
)

const lieuPrestation = computed(() =>
  demande.value?.lieu_prestation ||
  demande.value?.adresse ||
  demande.value?.localisation ||
  demande.value?.quartier ||
  demande.value?.ville ||
  'Lieu non renseigné',
)

// Le statut du devis, son libellé et ses couleurs.
const statut = computed(() =>
  devis.value?.statut ||
  'EN_ATTENTE',
)

const statutLabel = computed(() => {
  const labels = {
    EN_ATTENTE: 'En attente',
    ACCEPTE: 'Accepté',
    ACCEPTEE: 'Accepté',
    REFUSE: 'Refusé',
    REFUSEE: 'Refusé',
    EXPIRE: 'Expiré',
    EXPIREE: 'Expiré',
  }

  return labels[statut.value] || statut.value
})

const statutClasses = computed(() => {
  if (
    statut.value === 'ACCEPTE' ||
    statut.value === 'ACCEPTEE'
  ) {
    return 'bg-[#EAF8F2] text-[#16805B] border-[#CDE9DC]'
  }

  if (
    statut.value === 'REFUSE' ||
    statut.value === 'REFUSEE'
  ) {
    return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
  }

  if (
    statut.value === 'EXPIRE' ||
    statut.value === 'EXPIREE'
  ) {
    return 'bg-[#F1F5F9] text-[#68716C] border-[#E2E8F0]'
  }

  return 'bg-[#F2F3F0] text-[#1A1C1A] border-[#E5E7E2]'
})

/* -------------------------------------------------------------------------- */
/* Montants                                                                   */
/* -------------------------------------------------------------------------- */

// Les montants : main-d'œuvre, matériel, déplacement, prix proposé.
const mainOeuvre = computed(() =>
  Number(
    devis.value?.main_oeuvre ??
    devis.value?.cout_main_oeuvre ??
    0,
  ),
)

const materiel = computed(() =>
  Number(
    devis.value?.materiel ??
    devis.value?.cout_materiel ??
    0,
  ),
)

const deplacement = computed(() =>
  Number(
    devis.value?.deplacement ??
    devis.value?.frais_deplacement ??
    0,
  ),
)

const prixPropose = computed(() =>
  Number(
    devis.value?.prix_propose ??
    devis.value?.montant ??
    0,
  ),
)

// Le total à afficher.
const total = computed(() => {
  /*
   * Si le backend fournit un total, on l'utilise.
   * Sinon, on utilise le prix proposé.
   */
  if (
    devis.value?.total !== null &&
    devis.value?.total !== undefined
  ) {
    return Number(devis.value.total)
  }

  const detailsTotal =
    mainOeuvre.value +
    materiel.value +
    deplacement.value

  return detailsTotal > 0
    ? detailsTotal
    : prixPropose.value
})

// Le délai estimé.
const delaiEstime = computed(() =>
  devis.value?.delai_estime ||
  demande.value?.delai_estime ||
  null,
)

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

// Les initiales du client.
const initialesClient = computed(() => {
  const nom = clientNom.value

  return nom
    .split(' ')
    .filter(Boolean)
    .map((partie) => partie.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

/* -------------------------------------------------------------------------- */
/* Formatage                                                                  */
/* -------------------------------------------------------------------------- */

// Met un montant et une date au format français.
function formatMontant(value) {
  return Number(value || 0).toLocaleString('fr-FR')
}

function formatDate(value) {
  if (!value) {
    return 'Non renseignée'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Non renseignée'
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

function modifierDevis() {
  /*
   * À connecter à ta page/modal de modification
   * lorsque le endpoint de modification sera disponible.
   */
  router.push(`/prestataire/devis/${route.params.id}/modifier`)
}

function voirDemande() {
  if (!demande.value?.id) {
    return
  }

  router.push(
    `/prestataire/demandes-de-devis/${demande.value.id}`,
  )
}

async function annulerDevis() {
  /*
   * À connecter au endpoint d'annulation lorsque celui-ci
   * sera disponible dans devisService.
   */
  if (
    typeof devisService.cancelQuoteResponse !==
    'function'
  ) {
    errorMessage.value =
      "L'annulation des devis n'est pas encore disponible."
    return
  }

  try {
    await devisService.cancelQuoteResponse(
      devis.value.id,
    )

    await chargerDevis()
  } catch (error) {
    errorMessage.value =
      error?.message ||
      "Impossible d'annuler le devis."
  }
}
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="flex w-full flex-col">

      <ClientHeader
        title="Détail du devis"
        subtitle="Consultez les informations et le suivi de votre devis."
        :user-name="userName"
        profile-path="/prestataire/profil"
      />

      <main
        class="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10"
      >

        <!-- Retour -->
        <button
          type="button"
          class="inline-flex w-fit items-center gap-2 text-sm font-medium text-[#1A1C1A]/60 transition hover:text-[#1A1C1A]"
          @click="retourAuxDevis"
        >
          <ArrowLeft :size="15" />

          <span>Retour aux devis</span>
        </button>

        <!-- Chargement -->
        <div
          v-if="isLoading"
          class="flex min-h-[400px] items-center justify-center bg-[#FAFAF8]"
        >
          <p class="text-sm text-[#1A1C1A]/60">
            Chargement du devis...
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
            class="bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white hover:bg-[#24573F]"
            @click="chargerDevis"
          >
            Réessayer
          </button>
        </div>

        <!-- Contenu -->
        <template v-else-if="devis">

          <!-- En-tête devis -->
          <header
            class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div class="flex flex-col gap-2">
              <h1
                class="font-serif text-4xl font-normal leading-[48px] text-[#1A1C1A] sm:text-5xl"
              >
                Devis #{{ devis.numero || devis.reference || devis.id }}
              </h1>

              <p
                class="text-base leading-6 text-[#1A1C1A]/60"
              >
                Envoyé le {{ formatDate(dateCreation) }}
              </p>
            </div>

            <span
              class="w-fit shrink-0 border px-4 py-1.5 text-xs font-bold uppercase leading-[18px] tracking-[1.2px]"
              :class="statutClasses"
            >
              {{ statutLabel }}
            </span>
          </header>

          <!-- Colonnes -->
          <div
            class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
          >

            <!-- Colonne gauche -->
            <div class="flex flex-col gap-8">

              <!-- Client -->
              <section
                class="flex flex-col gap-6 border border-[#E5E7E2] bg-[#FAFAF8] p-6 sm:p-8"
              >
                <p
                  class="text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-[#1A1C1A]/40"
                >
                  Client
                </p>

                <div class="flex items-center gap-4">
                  <div
                    class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white text-lg font-medium text-[#2D6A4F]"
                  >
                    {{ initialesClient }}
                  </div>

                  <div class="min-w-0">
                    <h2
                      class="text-xl font-medium leading-[30px] text-[#1A1C1A]"
                    >
                      {{ clientNom }}
                    </h2>

                    <div
                      class="mt-1 flex items-center gap-1.5 text-sm leading-[21px] text-[#1A1C1A]/60"
                    >
                      <MapPin :size="14" />

                      <span>
                        {{ lieuPrestation }}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Détails -->
              <section
                class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 sm:p-8"
              >
                <p
                  class="mb-6 text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-[#1A1C1A]/40"
                >
                  Détails de la prestation
                </p>

                <dl class="grid gap-6">

                  <div class="grid gap-1">
                    <dt
                      class="text-xs font-bold uppercase leading-[18px] text-[#1A1C1A]/40"
                    >
                      Service
                    </dt>

                    <dd
                      class="text-base font-medium leading-6 text-[#1A1C1A]"
                    >
                      {{ serviceNom }}
                    </dd>
                  </div>

                  <div class="grid gap-1">
                    <dt
                      class="text-xs font-bold uppercase leading-[18px] text-[#1A1C1A]/40"
                    >
                      Date souhaitée
                    </dt>

                    <dd
                      class="text-base font-medium leading-6 text-[#1A1C1A]"
                    >
                      {{ formatDate(dateSouhaitee) }}
                    </dd>
                  </div>

                  <div class="grid gap-1">
                    <dt
                      class="text-xs font-bold uppercase leading-[18px] text-[#1A1C1A]/40"
                    >
                      Lieu de prestation
                    </dt>

                    <dd
                      class="text-base font-medium leading-6 text-[#1A1C1A]"
                    >
                      {{ lieuPrestation }}
                    </dd>
                  </div>

                  <div class="grid gap-1">
                    <dt
                      class="text-xs font-bold uppercase leading-[18px] text-[#1A1C1A]/40"
                    >
                      Description
                    </dt>

                    <dd
                      class="text-[15px] leading-6 text-[#1A1C1A]"
                    >
                      {{ description }}
                    </dd>
                  </div>

                </dl>
              </section>

              <!-- Information statut -->
              <div
                class="flex items-center gap-3 border-l-4 border-[#2D6A4F] bg-[#F2F3F0] p-5"
              >
                <CheckCircle2
                  :size="20"
                  class="shrink-0 text-[#2D6A4F]"
                />

                <p
                  class="text-sm font-medium leading-[21px] text-[#1A1C1A]"
                >
                  Devis {{ statutLabel.toLowerCase() }}.
                </p>
              </div>
            </div>

            <!-- Colonne droite -->
            <aside class="flex flex-col gap-6">

              <!-- Finances -->
              <section
                class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 sm:p-8"
              >
                <div class="pb-6">
                  <p
                    class="text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-[#1A1C1A]/40"
                  >
                    Détail financier
                  </p>
                </div>

                <div class="grid gap-4">

                  <div
                    v-if="mainOeuvre > 0"
                    class="flex items-center justify-between gap-4"
                  >
                    <span
                      class="text-sm text-[#1A1C1A]/60"
                    >
                      Main-d'œuvre
                    </span>

                    <span
                      class="text-sm font-medium text-[#1A1C1A]"
                    >
                      {{ formatMontant(mainOeuvre) }} FCFA
                    </span>
                  </div>

                  <div
                    v-if="materiel > 0"
                    class="flex items-center justify-between gap-4"
                  >
                    <span
                      class="text-sm text-[#1A1C1A]/60"
                    >
                      Matériel
                    </span>

                    <span
                      class="text-sm font-medium text-[#1A1C1A]"
                    >
                      {{ formatMontant(materiel) }} FCFA
                    </span>
                  </div>

                  <div
                    v-if="deplacement > 0"
                    class="flex items-center justify-between gap-4"
                  >
                    <span
                      class="text-sm text-[#1A1C1A]/60"
                    >
                      Déplacement
                    </span>

                    <span
                      class="text-sm font-medium text-[#1A1C1A]"
                    >
                      {{ formatMontant(deplacement) }} FCFA
                    </span>
                  </div>

                  <div
                    v-if="delaiEstime"
                    class="flex items-center justify-between gap-4"
                  >
                    <span
                      class="text-sm text-[#1A1C1A]/60"
                    >
                      Délai
                    </span>

                    <span
                      class="text-sm font-medium text-[#1A1C1A]"
                    >
                      {{ delaiEstime }} jour(s)
                    </span>
                  </div>
                </div>

                <!-- Total -->
                <div
                  class="mt-6 flex items-end justify-between gap-4 border-t border-[#E5E7E2] pt-5"
                >
                  <span
                    class="text-sm font-bold uppercase leading-[21px] tracking-[1.4px] text-[#1A1C1A]"
                  >
                    Total
                  </span>

                  <div class="text-right">
                    <p
                      class="font-serif text-3xl font-normal leading-[35px] text-[#1A1C1A]"
                    >
                      {{ formatMontant(total) }}
                    </p>

                    <p
                      class="text-xs font-bold uppercase leading-[18px] tracking-[0.38px] text-[#1A1C1A]/60"
                    >
                      FCFA
                    </p>
                  </div>
                </div>
              </section>

              <!-- Actions -->
              <div class="flex flex-col gap-3">

                <button
                  v-if="
                    statut === 'EN_ATTENTE'
                  "
                  type="button"
                  class="w-full bg-[#2D6A4F] px-4 py-4 text-sm font-bold uppercase leading-[21px] text-[#FAFAF8] transition hover:bg-[#24573F]"
                  @click="modifierDevis"
                >
                  <span class="inline-flex items-center justify-center gap-2">
                    <Pencil :size="15" />
                    Modifier le devis
                  </span>
                </button>

                <button
                  type="button"
                  class="w-full border border-[#E5E7E2] bg-[#FAFAF8] px-4 py-4 text-sm font-bold uppercase leading-[21px] text-[#1A1C1A] transition hover:bg-[#F2F3F0]"
                  @click="voirDemande"
                >
                  Voir la demande
                </button>

                <button
                  v-if="
                    statut === 'EN_ATTENTE'
                  "
                  type="button"
                  class="w-full bg-[#FEE2E2] px-4 py-4 text-sm font-bold uppercase leading-[21px] text-[#991B1B] transition hover:bg-[#FECACA]"
                  @click="annulerDevis"
                >
                  <span class="inline-flex items-center justify-center gap-2">
                    <XCircle :size="15" />
                    Annuler le devis
                  </span>
                </button>

              </div>
            </aside>
          </div>
        </template>
      </main>
    </div>
  </AppLayout>
</template>