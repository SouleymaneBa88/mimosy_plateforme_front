<!--
  Page "Demandes reçues" du prestataire : les demandes de prestation des
  clients, avec statistiques, filtres, recherche, pagination, et un panneau
  de détail pour accepter, refuser, terminer ou signaler un litige.
-->
<script setup>
// Outils Vue et icônes.
import { computed, onMounted, ref } from 'vue'
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
// L'en-tête prestataire est rendu automatiquement par AppLayout pour
// role="prestataire" : pas besoin de l'importer ici.
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import NouveauLitigeModal from '@/components/disputes/NouveauLitigeModal.vue'

// Le store des demandes, les toasts et le temps réel.
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { useToast } from '@/composables/useToast'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'

// Le store des demandes de prestation.
const demandeStore = useDemandePrestationStore()

/* =========================================================
   ÉTAT DE LA PAGE
========================================================= */

// Demande sélectionnée, texte de recherche, filtre actif, page actuelle, demandes par page.
const selectedId = ref('')
const recherche = ref('')
const filtreActif = ref('TOUTES')
const pageActuelle = ref(1)
const demandesParPage = 5

// Panneau de détail ouvert ? Action en cours ?
const detailOuvert = ref(false)
const actionEnCours = ref(false)

// Fenêtre de litige ouverte ?
const litigeModalOuvert = ref(false)

// Fonctions pour afficher un toast.
const { succes, erreur } = useToast()

/* =========================================================
   DONNÉES
========================================================= */

// La liste des demandes (lue dans le store).
const demandes = computed(() => {
  return Array.isArray(demandeStore.demandes)
    ? demandeStore.demandes
    : []
})

// La demande actuellement sélectionnée.
const demandeSelectionnee = computed(() => {
  return (
    demandes.value.find(
      (demande) => demande.id === selectedId.value
    ) ||
    demandes.value[0] ||
    null
  )
})

/* =========================================================
   STATUTS
========================================================= */

// Libellés lisibles et couleurs des statuts.
const statusLabels = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  REALISEE: 'Validation en attente',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const statusBadgeClasses = {
  EN_ATTENTE:
    'bg-[#F2F3F0] text-[#1A1C1A] border border-[#E5E7E2]',

  ACCEPTEE:
    'bg-[#2D6A4F] text-white',

  REFUSEE:
    'bg-[#F7DBDB] text-[#C22F2F]',

  REALISEE:
    'bg-[#FFF7E6] text-[#9A723C] border border-[#F1E3C4]',

  TERMINEE:
    'bg-[#2D6A4F] text-[#FFFFFF] border border-[#E5E7E2]',

  ANNULEE:
    'bg-[#F2F3F0] text-[#7A847E] border border-[#E5E7E2]',
}

// Classes CSS du badge d'un statut.
function badgeClass(statut) {
  return (
    statusBadgeClasses[statut] ||
    'bg-[#F2F3F0] text-[#7A847E] border border-[#E5E7E2]'
  )
}

/* =========================================================
   COMPTEURS
========================================================= */

// Les demandes rangées par état (en attente, acceptées, à valider, terminées).
const demandesEnAttente = computed(() =>
  demandes.value.filter(
    (demande) => demande.statut === 'EN_ATTENTE'
  )
)

const demandesAcceptees = computed(() =>
  demandes.value.filter(
    (demande) => demande.statut === 'ACCEPTEE'
  )
)

const demandesAValider = computed(() =>
  demandes.value.filter(
    (demande) => demande.statut === 'REALISEE'
  )
)

const demandesTerminees = computed(() =>
  demandes.value.filter(
    (demande) => demande.statut === 'TERMINEE'
  )
)

// Taux d'acceptation (en %).
const tauxAcceptation = computed(() => {
  if (!demandes.value.length) {
    return 0
  }

  return Math.round(
    (demandesAcceptees.value.length /
      demandes.value.length) *
      100
  )
})

/* =========================================================
   FILTRES
========================================================= */

// Les boutons de filtre (avec compteurs).
const filtres = computed(() => [
  {
    key: 'TOUTES',
    label: 'Toutes',
    nombre: demandes.value.length,
  },
  {
    key: 'EN_ATTENTE',
    label: 'En attente',
    nombre: demandesEnAttente.value.length,
  },
  {
    key: 'ACCEPTEE',
    label: 'Acceptées',
    nombre: demandesAcceptees.value.length,
  },
  {
    key: 'REALISEE',
    label: 'À valider par le client',
    nombre: demandesAValider.value.length,
  },
  {
    key: 'TERMINEE',
    label: 'Terminées',
    nombre: demandesTerminees.value.length,
  },
])

// Les demandes filtrées (filtre + texte de recherche).
const demandesFiltrees = computed(() => {
  let resultat = [...demandes.value]

  if (filtreActif.value !== 'TOUTES') {
    resultat = resultat.filter(
      (demande) =>
        demande.statut === filtreActif.value
    )
  }

  const terme = recherche.value
    .trim()
    .toLowerCase()

  if (terme) {
    resultat = resultat.filter((demande) => {
      const client =
        demande.client_nom ||
        demande.client?.nom_complet ||
        ''

      const service =
        demande.service_nom ||
        demande.service?.nom ||
        ''

      const localisation =
        demande.localisation ||
        demande.adresse ||
        demande.quartier ||
        demande.ville ||
        ''

      return (
        String(client)
          .toLowerCase()
          .includes(terme) ||
        String(service)
          .toLowerCase()
          .includes(terme) ||
        String(localisation)
          .toLowerCase()
          .includes(terme)
      )
    })
  }

  return resultat
})

/* =========================================================
   PAGINATION
========================================================= */

// Nombre total de pages.
const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(
      demandesFiltrees.value.length /
        demandesParPage
    )
  )
})

// Les demandes de la page actuelle.
const demandesAffichees = computed(() => {
  const debut =
    (pageActuelle.value - 1) *
    demandesParPage

  const fin = debut + demandesParPage

  return demandesFiltrees.value.slice(
    debut,
    fin
  )
})

// Numéros de la première et de la dernière demande affichées.
const premiereDemande = computed(() => {
  if (!demandesFiltrees.value.length) {
    return 0
  }

  return (
    (pageActuelle.value - 1) *
      demandesParPage +
    1
  )
})

const derniereDemande = computed(() => {
  return Math.min(
    pageActuelle.value *
      demandesParPage,
    demandesFiltrees.value.length
  )
})

// Les numéros de page à afficher.
const pages = computed(() => {
  const resultat = []

  const debut = Math.max(
    1,
    pageActuelle.value - 1
  )

  const fin = Math.min(
    totalPages.value,
    pageActuelle.value + 1
  )

  for (let page = debut; page <= fin; page++) {
    resultat.push(page)
  }

  return resultat
})

// Change de filtre et revient à la page 1.
function changerFiltre(filtre) {
  filtreActif.value = filtre
  pageActuelle.value = 1
}

// Va à une autre page.
function changerPage(page) {
  if (
    page < 1 ||
    page > totalPages.value
  ) {
    return
  }

  pageActuelle.value = page
}

/* =========================================================
   CLIENT
========================================================= */

// Petites fonctions d'affichage : nom, initiales et photo du client, service, lieu.
function nomClient(demande) {
  return (
    demande.client_nom ||
    demande.client?.nom_complet ||
    [
      demande.client?.first_name,
      demande.client?.last_name,
    ]
      .filter(Boolean)
      .join(' ') ||
    'Client'
  )
}

function initialesClient(demande) {
  const nom = nomClient(demande)

  const morceaux = nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!morceaux.length) {
    return 'CL'
  }

  if (morceaux.length === 1) {
    return morceaux[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    morceaux[0][0] +
    morceaux[1][0]
  ).toUpperCase()
}

function avatarClient(demande) {
  return (
    demande.client_photo ||
    demande.client_avatar ||
    demande.client?.photo ||
    demande.client?.avatar ||
    null
  )
}

/* =========================================================
   SERVICE
========================================================= */

function nomService(demande) {
  return (
    demande.service_nom ||
    demande.service?.nom ||
    'Service non renseigné'
  )
}

/* =========================================================
   LOCALISATION
========================================================= */

function localisationDemande(demande) {
  return (
    demande.localisation ||
    demande.adresse ||
    demande.quartier ||
    demande.ville ||
    demande.localisation_nom ||
    demande.location?.quartier ||
    demande.location?.ville ||
    'Localisation non renseignée'
  )
}

/* =========================================================
   DATE
========================================================= */

// Mise en forme des dates, heures et montants.
function formatDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString(
    'fr-FR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function formatDatePrincipale(value) {
  if (!value) {
    return 'Date non renseignée'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const maintenant = new Date()

  const debutAujourdHui = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate()
  )

  const debutDemain = new Date(
    debutAujourdHui
  )

  debutDemain.setDate(
    debutDemain.getDate() + 1
  )

  const debutHier = new Date(
    debutAujourdHui
  )

  debutHier.setDate(
    debutHier.getDate() - 1
  )

  if (date >= debutAujourdHui) {
    return "Aujourd'hui"
  }

  if (date >= debutHier) {
    return 'Hier'
  }

  if (date >= debutDemain) {
    return 'Demain'
  }

  return date.toLocaleDateString(
    'fr-FR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

function formatHeure(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return (
    date.toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ) + ' GMT'
  )
}

/* =========================================================
   MONTANT
========================================================= */

function formatMontant(demande) {
  const montant =
    demande.budget ??
    demande.montant ??
    demande.prix ??
    demande.montant_estime ??
    demande.montant_total

  if (
    montant === null ||
    montant === undefined ||
    montant === ''
  ) {
    return '—'
  }

  const nombre = Number(montant)

  if (Number.isNaN(nombre)) {
    return `${montant} FCFA`
  }

  return (
    new Intl.NumberFormat('fr-FR').format(
      nombre
    ) + ' FCFA'
  )
}

/* =========================================================
   NAVIGATION
========================================================= */

// Sélectionne une demande et ouvre son détail.
function selectDemande(id) {
  selectedId.value = id
  detailOuvert.value = true
}

// Ferme le panneau de détail.
function fermerDetail() {
  detailOuvert.value = false
}

/* =========================================================
   ACTIONS DEMANDE
========================================================= */

// Fonction commune pour changer le statut d'une demande (accepter, refuser, terminer).
async function changerStatut(action, id, messageSucces) {
  actionEnCours.value = true

  try {
    await action(id)
    selectedId.value = id
    succes(messageSucces)
  } catch (requestError) {
    erreur(
      requestError?.message ||
        "Une erreur est survenue lors de la mise à jour de la demande."
    )
  } finally {
    actionEnCours.value = false
  }
}

// Accepter, refuser ou terminer la demande sélectionnée.
async function accepterDemande() {
  await changerStatut(
    demandeStore.accepterDemande,
    demandeSelectionnee.value.id,
    'Demande acceptée.'
  )
}

async function refuserDemande() {
  await changerStatut(
    demandeStore.refuserDemande,
    demandeSelectionnee.value.id,
    'Demande refusée.'
  )
}

async function terminerDemande() {
  await changerStatut(
    demandeStore.terminerDemande,
    demandeSelectionnee.value.id,
    'Prestation marquée comme terminée : en attente de validation du client.'
  )
}

/* =========================================================
   LITIGE
========================================================= */

// Ouvre la fenêtre de litige.
function ouvrirLitige() {
  detailOuvert.value = false
  litigeModalOuvert.value = true
}

// Appelée quand le litige vient d'être créé.
function litigeCree() {
  succes(
    'Votre litige a été envoyé à MIMOSY.'
  )
}

/* =========================================================
   CHARGEMENT
========================================================= */

// On recharge quand une demande arrive ou change de statut (temps réel).
useEvenementTempsReel(['demande.nouvelle', 'demande.statut'], () => demandeStore.chargerDemandes(true).catch(() => {}))

// Au montage : on charge les demandes.
onMounted(async () => {
  await demandeStore
    .chargerDemandes(true)
    .catch(() => {})

  selectedId.value =
    demandes.value[0]?.id || ''
})
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="flex w-full flex-col gap-8">

        <!-- =================================================
             EN-TÊTE
        ================================================== -->

        <section
          class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"
        >
          <div class="flex flex-col gap-2">
            <h1
              class="font-['Instrument_Serif'] text-[48px] font-normal leading-[48px] tracking-tight text-[#1A1C1A]"
            >
              Mes demandes
            </h1>

            <p
              class="font-['DM_Sans'] text-base leading-6 text-[#1A1C1A]/60"
            >
              Gérez vos opportunités de services
              à travers Dakar.
            </p>
          </div>

          <!-- Statistiques -->
          <div
            class="flex items-stretch"
          >
            <div
              class="bg-[#FAFAF8] px-6 py-3 outline outline-1 -outline-offset-1 outline-[#E5E7E2]"
            >
              <p
                class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40"
              >
                Total demandes
              </p>

              <p
                class="font-['Instrument_Serif'] text-2xl leading-8 tracking-[0.45px] text-[#1A1C1A]"
              >
                {{ demandes.length }}
              </p>
            </div>

            <div class="ml-4">
              <div
                class="h-full bg-[#2D6A4F] px-6 py-3 outline outline-1 -outline-offset-1 outline-[#E5E7E2]"
              >
                <p
                  class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-white/70"
                >
                  Taux d'acceptation
                </p>

                <p
                  class="font-['Instrument_Serif'] text-2xl leading-8 tracking-[0.52px] text-white"
                >
                  {{ tauxAcceptation }}%
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- =================================================
             FILTRES
        ================================================== -->

        <section
          class="flex flex-col justify-between gap-4 border border-[#E5E7E2] bg-[#FAFAF8] p-2 lg:flex-row lg:items-center rounded-2xl"
        >
          <div
            class="flex flex-wrap items-center"
          >
            <button
              v-for="filtre in filtres"
              :key="filtre.key"
              type="button"
              class="px-6 py-3 font-['DM_Sans'] text-sm font-bold uppercase leading-5 tracking-[1.4px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              :class="
                filtreActif === filtre.key
                  ? 'bg-[#1A1C1A] text-[#F2F3F0]'
                  : 'text-[#1A1C1A]/40 hover:text-[#1A1C1A]'
              "
              @click="changerFiltre(filtre.key)"
            >
              {{ filtre.label }}

              <span
                v-if="
                  filtre.key !== 'TOUTES'
                "
              >
                ({{ filtre.nombre }})
              </span>
            </button>
          </div>

          <div
            class="flex items-center border-l border-[#E5E7E2] pl-4"
          >
            <div class="relative">
              <Search
                :size="15"
                stroke-width="1.8"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1C1A]/30"
              />

              <input
                v-model="recherche"
                type="search"
                placeholder="Rechercher un client..."
                class="h-9 w-full bg-[#F2F3F0] pl-9 pr-4 font-['DM_Sans'] text-xs text-[#1A1C1A] outline-none placeholder:text-[#9CA3AF] focus:ring-1 focus:ring-[#2D6A4F] sm:w-[256px]"
                @input="
                  pageActuelle = 1
                "
              />
            </div>

            <button
              type="button"
              class="ml-4 flex h-9 w-9 items-center justify-center border border-[#E5E7E2] text-[#1A1C1A]/60 transition hover:bg-[#F2F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              aria-label="Filtrer les demandes"
            >
              <SlidersHorizontal
                :size="15"
                stroke-width="1.7"
              />
            </button>
          </div>
        </section>

        <!-- =================================================
             CHARGEMENT
        ================================================== -->

        <div
          v-if="demandeStore.isLoading"
          class="border border-[#E5E7E2] bg-[#FAFAF8] px-6 py-16 text-center font-['DM_Sans'] text-sm text-[#7A847E]"
        >
          Chargement des demandes...
        </div>

        <!-- =================================================
             ERREUR
        ================================================== -->

        <div
          v-else-if="demandeStore.errorMessage"
          class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 font-['DM_Sans'] text-sm text-[#C22F2F]"
        >
          {{ demandeStore.errorMessage }}
        </div>

        <!-- =================================================
             AUCUNE DEMANDE
        ================================================== -->

        <EmptyState
          v-else-if="!demandes.length"
          title="Aucune demande reçue"
          message="Les demandes envoyées à vos services apparaîtront ici."
        />

        <!-- =================================================
             TABLEAU
        ================================================== -->

        <section
          v-else
          class="w-full overflow-x-auto rounded-2xl border border-[#E5E7E2] bg-[#FAFAF8]"
        >
          <div
            class="min-w-[1050px]"
          >

            <!-- En-tête -->
            <div
              class="grid grid-cols-[1.15fr_1.65fr_1fr_0.85fr_0.9fr_0.65fr] border-b border-[#E5E7E2] bg-[#F2F3F0]/30 rounded-2xl"
            >
              <div
                class="px-8 py-5"
              >
                <span class="table-heading">
                  Client
                </span>
              </div>

              <div
                class="px-8 py-5"
              >
                <span class="table-heading">
                  Service & Localisation
                </span>
              </div>

              <div
                class="px-8 py-5"
              >
                <span class="table-heading">
                  Date & Heure
                </span>
              </div>

              <div
                class="px-8 py-5"
              >
                <span class="table-heading">
                  Montant
                </span>
              </div>

              <div
                class="px-8 py-5"
              >
                <span class="table-heading">
                  Statut
                </span>
              </div>

              <div
                class="px-8 py-5 text-right"
              >
                <span class="table-heading">
                  Action
                </span>
              </div>
            </div>

            <!-- Aucune correspondance -->
            <div
              v-if="
                !demandesAffichees.length
              "
              class="px-8 py-16"
            >
              <EmptyState
                title="Aucune demande"
                message="Aucune demande ne correspond aux critères sélectionnés."
              />
            </div>

            <!-- Lignes -->
            <div v-else>
              <div
                v-for="demande in demandesAffichees"
                :key="demande.id"
                class="grid grid-cols-[1.15fr_1.65fr_1fr_0.85fr_0.9fr_0.65fr] border-b border-[#E5E7E2] last:border-b-0"
              >

                <!-- CLIENT -->
                <div
                  class="flex items-center px-8 py-6"
                >
                  <div
                    class="flex min-w-0 items-center"
                  >
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7E2] bg-[#F2F3F0]"
                    >
                      <img
                        v-if="
                          avatarClient(demande)
                        "
                        :src="
                          avatarClient(
                            demande
                          )
                        "
                        :alt="
                          nomClient(
                            demande
                          )
                        "
                        class="h-full w-full object-cover"
                      />

                      <span
                        v-else
                        class="font-['DM_Sans'] text-xs font-bold text-[#2D6A4F]"
                      >
                        {{
                          initialesClient(
                            demande
                          )
                        }}
                      </span>
                    </div>

                    <div
                      class="ml-4 min-w-0"
                    >
                      <p
                        class="truncate font-['DM_Sans'] text-sm font-bold leading-5 text-[#1A1C1A]"
                      >
                        {{
                          nomClient(
                            demande
                          )
                        }}
                      </p>

                      <p
                        class="truncate font-['DM_Sans'] text-[10px] uppercase leading-[15px] text-[#1A1C1A]/50"
                      >
                        Client
                      </p>
                    </div>
                  </div>
                </div>

                <!-- SERVICE -->
                <div
                  class="flex flex-col justify-center gap-1 px-8 py-6"
                >
                  <p
                    class="truncate font-['DM_Sans'] text-sm font-medium leading-5 text-[#1A1C1A]"
                  >
                    {{
                      nomService(
                        demande
                      )
                    }}
                  </p>

                  <div
                    class="flex items-center gap-1.5 font-['DM_Sans'] text-xs leading-4 text-[#1A1C1A]/50"
                  >
                    <MapPin
                      :size="12"
                      stroke-width="1.7"
                      class="shrink-0"
                    />

                    <span
                      class="truncate"
                    >
                      {{
                        localisationDemande(
                          demande
                        )
                      }}
                    </span>
                  </div>
                </div>

                <!-- DATE -->
                <div
                  class="flex flex-col justify-center px-8 py-6"
                >
                  <p
                    class="font-['DM_Sans'] text-sm font-medium leading-5 text-[#1A1C1A]"
                  >
                    {{
                      formatDatePrincipale(
                        demande.date_souhaitee
                      )
                    }}
                  </p>

                  <p
                    v-if="
                      formatHeure(
                        demande.date_souhaitee
                      )
                    "
                    class="font-['DM_Sans'] text-xs leading-4 text-[#1A1C1A]/50"
                  >
                    {{
                      formatHeure(
                        demande.date_souhaitee
                      )
                    }}
                  </p>
                </div>

                <!-- MONTANT -->
                <div
                  class="flex items-center px-8 py-6"
                >
                  <span
                    class="font-['Instrument_Serif'] text-sm leading-5 text-[#1A1C1A]"
                  >
                    {{
                      formatMontant(
                        demande
                      )
                    }}
                  </span>
                </div>

                <!-- STATUT -->
                <div
                  class="flex items-center px-8 py-6"
                >
                  <span
                    class="inline-flex px-3 py-1 font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] rounded-2xl"
                    :class="
                      badgeClass(
                        demande.statut
                      )
                    "
                  >
                    {{
                      statusLabels[
                        demande.statut
                      ] ||
                      demande.statut
                    }}
                  </span>
                </div>

                <!-- ACTION -->
                <div
                  class="flex items-center justify-end px-8 py-6"
                >
                  <button
                    type="button"
                    class="border border-[#1A1C1A] px-4 py-2 font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A] transition hover:bg-[#2D6A4F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] rounded-2xl"
                    @click="
                      selectDemande(
                        demande.id
                      )
                    "
                  >
                    Voir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- =================================================
             PAGINATION
        ================================================== -->

        <footer
          v-if="
            !demandeStore.isLoading &&
            !demandeStore.errorMessage &&
            demandesFiltrees.length
          "
          class="flex flex-col gap-5 pb-10 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p
            class="font-['DM_Sans'] text-xs font-bold uppercase leading-4 tracking-[1.2px] text-[#1A1C1A]/50"
          >
            Affichage de
            {{ premiereDemande }}
            -
            {{ derniereDemande }}
            sur
            {{ demandesFiltrees.length }}
            demandes
          </p>

          <div
            class="flex items-center"
          >
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center border border-[#E5E7E2] text-[#1A1C1A]/50 transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              :disabled="
                pageActuelle === 1
              "
              aria-label="Page précédente"
              @click="
                changerPage(
                  pageActuelle - 1
                )
              "
            >
              <ChevronLeft
                :size="16"
                stroke-width="1.8"
              />
            </button>

            <button
              v-for="page in pages"
              :key="page"
              type="button"
              class="ml-2 flex h-10 w-10 items-center justify-center border border-[#E5E7E2] font-['DM_Sans'] text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] rounded-3xl"
              :class="
                page === pageActuelle
                  ? 'bg-[#1A1C1A] text-white'
                  : 'text-[#1A1C1A] hover:bg-[#FAFAF8]'
              "
              @click="
                changerPage(page)
              "
            >
              {{ page }}
            </button>

            <button
              type="button"
              class="ml-2 flex h-10 w-10 items-center justify-center border border-[#E5E7E2] text-[#1A1C1A] transition hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              :disabled="
                pageActuelle ===
                totalPages
              "
              aria-label="Page suivante"
              @click="
                changerPage(
                  pageActuelle + 1
                )
              "
            >
              <ChevronRight
                :size="16"
                stroke-width="1.8"
              />
            </button>
          </div>
        </footer>
    </div>

    <!-- ===================================================
         MODALE DÉTAIL DEMANDE
    ==================================================== -->

    <Modal
      :model-value="detailOuvert"
      title="Détail de la demande"
      @update:model-value="fermerDetail"
    >
      <div v-if="demandeSelectionnee" class="flex flex-col gap-6">
        <!-- Client -->
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7E2] bg-[#F2F3F0]">
            <img
              v-if="avatarClient(demandeSelectionnee)"
              :src="avatarClient(demandeSelectionnee)"
              :alt="nomClient(demandeSelectionnee)"
              class="h-full w-full object-cover"
            />
            <span v-else class="font-['DM_Sans'] text-sm font-bold text-[#2D6A4F]">
              {{ initialesClient(demandeSelectionnee) }}
            </span>
          </div>

          <div class="min-w-0">
            <p class="truncate font-['DM_Sans'] text-sm font-bold leading-5 text-[#1A1C1A]">
              {{ nomClient(demandeSelectionnee) }}
            </p>
            <p class="font-['DM_Sans'] text-xs uppercase leading-4 text-[#1A1C1A]/50">
              Client
            </p>
          </div>

          <span
            class="ml-auto inline-flex shrink-0 px-3 py-1 font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px]"
            :class="badgeClass(demandeSelectionnee.statut)"
          >
            {{ statusLabels[demandeSelectionnee.statut] || demandeSelectionnee.statut }}
          </span>
        </div>

        <!-- Service, localisation, date, montant -->
        <div class="grid grid-cols-1 gap-4 border-t border-[#E5E7E2] pt-6 sm:grid-cols-2">
          <div>
            <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
              Service
            </p>
            <p class="mt-1 font-['DM_Sans'] text-sm text-[#1A1C1A]">
              {{ nomService(demandeSelectionnee) }}
            </p>
          </div>

          <div>
            <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
              Localisation
            </p>
            <p class="mt-1 flex items-center gap-1.5 font-['DM_Sans'] text-sm text-[#1A1C1A]">
              <MapPin :size="14" stroke-width="1.7" class="shrink-0 text-[#1A1C1A]/40" />
              {{ localisationDemande(demandeSelectionnee) }}
            </p>
          </div>

          <div>
            <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
              Date souhaitée
            </p>
            <p class="mt-1 font-['DM_Sans'] text-sm text-[#1A1C1A]">
              {{ formatDate(demandeSelectionnee.date_souhaitee) }}
            </p>
          </div>

          <div>
            <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
              Montant
            </p>
            <p class="mt-1 font-['Instrument_Serif'] text-lg text-[#1A1C1A]">
              {{ formatMontant(demandeSelectionnee) }}
            </p>
          </div>
        </div>

        <!-- Paiement : confirmé par PayDunya (jamais supposé), et fonds sécurisés -->
        <div
          v-if="['ACCEPTEE', 'REALISEE', 'TERMINEE'].includes(demandeSelectionnee.statut)"
          class="border-t border-[#E5E7E2] pt-6"
        >
          <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
            Paiement
          </p>
          <div
            v-if="demandeSelectionnee.paiement?.statut === 'REUSSI'"
            class="mt-2 bg-[#EAF8F2] p-4 font-['DM_Sans'] text-sm text-[#16805B]"
          >
            <p class="font-bold">
              {{ demandeSelectionnee.statut === 'TERMINEE' ? 'Paiement reçu' : 'Paiement reçu et sécurisé' }}
              · {{ Number(demandeSelectionnee.paiement.montant).toLocaleString('fr-FR') }} FCFA
            </p>
            <p class="mt-1 text-[#1A1C1A]/70">
              <template v-if="demandeSelectionnee.litige_en_cours">Litige en cours : les fonds restent sécurisés jusqu'à sa résolution.</template>
              <template v-else-if="demandeSelectionnee.statut === 'ACCEPTEE'">Statut : prestation à réaliser. Le montant sera disponible dans votre wallet après la validation du client.</template>
              <template v-else-if="demandeSelectionnee.statut === 'REALISEE'">En attente de validation du client<span v-if="demandeSelectionnee.date_limite_validation"> (validation automatique le {{ formatDate(demandeSelectionnee.date_limite_validation) }})</span>.</template>
              <template v-else>Prestation validée : le montant, commission MIMOSY déduite, est disponible dans votre wallet.</template>
            </p>
          </div>
          <p
            v-else-if="['EN_ATTENTE', 'INITIE'].includes(demandeSelectionnee.paiement?.statut)"
            class="mt-2 bg-[#EDF4FF] p-4 font-['DM_Sans'] text-sm text-[#3267B1]"
          >
            Paiement du client en attente de confirmation par PayDunya.
          </p>
          <p v-else class="mt-2 bg-[#F2F3F0] p-4 font-['DM_Sans'] text-sm text-[#1A1C1A]/70">
            Aucun paiement MIMOSY reçu pour cette demande.
          </p>
        </div>

        <!-- Description -->
        <div class="border-t border-[#E5E7E2] pt-6">
          <p class="font-['DM_Sans'] text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#1A1C1A]/40">
            Description
          </p>
          <p class="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-[#1A1C1A]/80">
            {{ demandeSelectionnee.description || 'Aucune description.' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 border-t border-[#E5E7E2] pt-6 sm:flex-row sm:flex-wrap">
          <template v-if="demandeSelectionnee.statut === 'EN_ATTENTE'">
            <button
              type="button"
              class="flex-1 bg-[#2D6A4F] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-white transition-colors hover:bg-[#24573F] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
              :disabled="actionEnCours"
              @click="accepterDemande"
            >
              {{ actionEnCours ? 'Patientez…' : 'Accepter' }}
            </button>

            <button
              type="button"
              class="flex-1 border border-[#C22F2F] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-[#C22F2F] transition-colors hover:bg-[#F7DBDB] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C22F2F] focus-visible:ring-offset-2"
              :disabled="actionEnCours"
              @click="refuserDemande"
            >
              Refuser
            </button>
          </template>

          <template v-else-if="demandeSelectionnee.statut === 'ACCEPTEE'">
            <button
              type="button"
              class="flex-1 bg-[#2D6A4F] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-white transition-colors hover:bg-[#24573F] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
              :disabled="actionEnCours"
              @click="terminerDemande"
            >
              {{ actionEnCours ? 'Patientez…' : 'Marquer la prestation comme terminée' }}
            </button>

            <button
              type="button"
              class="border border-[#E5E7E2] px-5 py-3 font-['DM_Sans'] text-sm font-medium text-[#1A1C1A] transition-colors hover:bg-[#F2F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
              @click="ouvrirLitige"
            >
              Signaler un litige
            </button>
          </template>

          <template v-else-if="demandeSelectionnee.statut === 'REALISEE'">
            <p class="flex-1 bg-[#FFF7E6] px-5 py-3 font-['DM_Sans'] text-sm font-bold text-[#9A723C]">
              En attente de validation client
            </p>
            <button
              v-if="!demandeSelectionnee.litige_en_cours"
              type="button"
              class="border border-[#E5E7E2] px-5 py-3 font-['DM_Sans'] text-sm font-medium text-[#1A1C1A] transition-colors hover:bg-[#F2F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
              @click="ouvrirLitige"
            >
              Signaler un litige
            </button>
          </template>

          <template v-else-if="demandeSelectionnee.statut === 'TERMINEE'">
            <button
              type="button"
              class="border border-[#E5E7E2] px-5 py-3 font-['DM_Sans'] text-sm font-medium text-[#1A1C1A] transition-colors hover:bg-[#F2F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
              @click="ouvrirLitige"
            >
              Signaler un litige
            </button>
          </template>
        </div>
      </div>
    </Modal>

    <!-- ===================================================
         MODALE LITIGE
    ==================================================== -->

    <NouveauLitigeModal
      v-model="litigeModalOuvert"
      :demande="demandeSelectionnee"
      role="PRESTATAIRE"
      @cree="litigeCree"
    />
  </AppLayout>
</template>

<style scoped>
.table-heading {
  color: #1a1c1a;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 2.4px;
  text-transform: uppercase;
  opacity: 0.4;
}
</style>