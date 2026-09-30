<!--
  Page "Wallet" (portefeuille) du prestataire :
  - ses soldes (disponible, bloqué) et ses gains ;
  - l'historique des transactions (filtres, pagination, export CSV) ;
  - une courbe d'évolution des gains ;
  - la demande de retrait vers Wave ou Orange Money (en 3 étapes :
    formulaire -> récapitulatif -> résultat).
-->
<script setup>
// Outils Vue et icônes.
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Wallet,
  Clock3,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-vue-next'

// Les composants de la page et les appels à l'API du wallet.
import AppLayout from '@/components/layout/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import * as walletService from '@/services/walletService'

// Le wallet (soldes), les transactions et les retraits.
const wallet = ref(null)
const transactions = ref([])
const retraits = ref([])

// États : chargement et erreur.
const loading = ref(false)
const errorMessage = ref('')

// Filtre ouvert ? Statut filtré ? Page actuelle ? Nombre de lignes par page.
const filtreOuvert = ref(false)
const filtreStatut = ref('TOUS')
const page = ref(1)
const parPage = 5

// 'ferme' | 'formulaire' | 'recap' | 'resultat'
const etape = ref('ferme')

// Les valeurs du formulaire de retrait.
const form = reactive({
  montant: '',
  provider: 'WAVE',
  destination: '',
})

// Erreur du formulaire, envoi en cours, et dernier retrait demandé (pour l'étape "résultat").
const formulaireErreur = ref('')
const formulaireEnvoi = ref(false)
const dernierRetrait = ref(null)

// Les moyens de retrait proposés.
const MOYENS = [
  {
    value: 'WAVE',
    label: 'Wave',
  },
  {
    value: 'ORANGE_MONEY',
    label: 'Orange Money',
  },
]

// Libellés lisibles des types de transactions.
const typeLabels = {
  BLOCAGE: 'Fonds bloqués',
  COMMISSION: 'Commission MIMOSY',
  LIBERATION: 'Fonds libérés',
  RETRAIT: 'Retrait',
  REMBOURSEMENT: 'Remboursement',
}

// Libellés et couleurs des statuts de retrait.
const statutRetraitLabels = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  REUSSI: 'Réussi',
  ECHOUE: 'Échoué',
  ANNULE: 'Annulé',
  // Démonstration (PAYDUNYA_PAYOUT_DEMO) : aucun déboursement PayDunya réel.
  SIMULE: 'Simulation (démo)',
}

const statutRetraitCouleur = {
  EN_ATTENTE: 'bg-[#F2F3F0] text-[#7A847E]',
  EN_COURS: 'bg-[#DBE8F7] text-[#3267B1]',
  REUSSI: 'bg-[#E2EAE4] text-[#2D6A4F]',
  ECHOUE: 'bg-[#F7DBDB] text-[#991B1B]',
  ANNULE: 'bg-[#F2F3F0] text-[#64748B]',
  SIMULE: 'bg-[#FFF4DB] text-[#8A5A00]',
}

// Le nom du moyen de retrait choisi.
const moyenLabel = computed(() =>
  MOYENS.find((moyen) => moyen.value === form.provider)?.label ||
  form.provider,
)

/* -------------------------------------------------------------------------- */
/* Formatage                                                                  */
/* -------------------------------------------------------------------------- */

// Mise en forme des montants et des dates.
function formaterMontant(valeur) {
  const nombre = Number(valeur || 0)

  return `${nombre.toLocaleString('fr-FR')} FCFA`
}

function formaterMontantCourt(valeur) {
  const nombre = Number(valeur || 0)

  return nombre.toLocaleString('fr-FR')
}

function formaterDate(valeur) {
  if (!valeur) return '—'

  const date = new Date(valeur)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formaterDateComplete(valeur) {
  if (!valeur) return '—'

  const date = new Date(valeur)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* -------------------------------------------------------------------------- */
/* Données wallet                                                              */
/* -------------------------------------------------------------------------- */

// Solde disponible (retirable) et solde bloqué (en attente de validation des prestations).
const soldeDisponible = computed(() =>
  Number(wallet.value?.solde_disponible || 0),
)

const soldeBloque = computed(() =>
  Number(wallet.value?.solde_bloque || 0),
)

// Total gagné.
const totalGagne = computed(() => {
  if (wallet.value?.total_gagne !== undefined) {
    return Number(wallet.value.total_gagne || 0)
  }

  return transactions.value
    .filter((transaction) => transaction.type === 'LIBERATION')
    .reduce(
      (total, transaction) => total + Number(transaction.montant || 0),
      0,
    )
})

// Les transactions avec leur statut calculé.
const transactionsAvecStatut = computed(() =>
  transactions.value.map((transaction) => ({
    ...transaction,
    statutAffiche:
      transaction.statut ||
      transaction.status ||
      (
        transaction.type === 'LIBERATION'
          ? 'VERSE'
          : transaction.type === 'BLOCAGE'
            ? 'BLOQUE'
            : 'EN_ATTENTE'
      ),
  })),
)

/* -------------------------------------------------------------------------- */
/* Statistiques                                                                */
/* -------------------------------------------------------------------------- */

// Retraits en attente et montant total en attente.
const retraitsEnAttente = computed(() =>
  retraits.value.filter((retrait) =>
    ['EN_ATTENTE', 'EN_COURS'].includes(retrait.statut),
  ),
)

const montantEnAttente = computed(() =>
  retraitsEnAttente.value.reduce(
    (total, retrait) => total + Number(retrait.montant || 0),
    0,
  ),
)

// Les transactions filtrées par statut.
const transactionsFiltrees = computed(() => {
  if (filtreStatut.value === 'TOUS') {
    return transactionsAvecStatut.value
  }

  return transactionsAvecStatut.value.filter(
    (transaction) => transaction.statutAffiche === filtreStatut.value,
  )
})

// Pagination : nombre de pages, lignes de la page, numéros affichés.
const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(transactionsFiltrees.value.length / parPage),
  ),
)

const transactionsPaginees = computed(() => {
  const debut = (page.value - 1) * parPage

  return transactionsFiltrees.value.slice(
    debut,
    debut + parPage,
  )
})

const debutAffichage = computed(() => {
  if (!transactionsFiltrees.value.length) return 0

  return (page.value - 1) * parPage + 1
})

const finAffichage = computed(() =>
  Math.min(
    page.value * parPage,
    transactionsFiltrees.value.length,
  ),
)

const pagesVisibles = computed(() => {
  const total = totalPages.value

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  if (page.value <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (page.value >= total - 2) {
    return [
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ]
  }

  return [
    page.value - 2,
    page.value - 1,
    page.value,
    page.value + 1,
    page.value + 2,
  ]
})

/* -------------------------------------------------------------------------- */
/* Évolution                                                                  */
/* -------------------------------------------------------------------------- */

// Les points de la courbe d'évolution des gains (si le serveur les fournit).
const evolution = computed(() => {
  const source =
    wallet.value?.evolution ||
    wallet.value?.evolution_gains ||
    wallet.value?.historique_gains ||
    []

  if (!Array.isArray(source)) {
    return []
  }

  return source
    .map((item) => ({
      date:
        item.date ||
        item.jour ||
        item.mois ||
        item.label,
      montant: Number(
        item.montant ||
        item.gain ||
        item.gains ||
        item.net ||
        0,
      ),
    }))
    .filter((item) => item.date)
})

// Calcule le tracé SVG de la courbe (points, zone colorée, graduations).
const graphique = computed(() => {
  if (!evolution.value.length) {
    return {
      points: '',
      aire: '',
      maximum: 0,
      lignes: [],
    }
  }

  const largeur = 1000
  const hauteur = 190
  const margeX = 12
  const margeY = 10

  const maximum = Math.max(
    ...evolution.value.map((item) => item.montant),
    1,
  )

  const points = evolution.value.map((item, index) => {
    const x =
      evolution.value.length === 1
        ? largeur / 2
        : margeX +
          (index / (evolution.value.length - 1)) *
            (largeur - margeX * 2)

    const y =
      hauteur -
      margeY -
      (item.montant / maximum) *
        (hauteur - margeY * 2)

    return {
      ...item,
      x,
      y,
    }
  })

  const ligne = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  const aire = [
    `${points[0].x},${hauteur}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${hauteur}`,
  ].join(' ')

  return {
    points: ligne,
    aire,
    maximum,
    lignes: points,
  }
})

// Les graduations de l'axe vertical.
const graduationsGraphique = computed(() => {
  const maximum = graphique.value.maximum

  if (!maximum) {
    return [0, 0, 0, 0, 0, 0]
  }

  return [
    maximum,
    maximum * 0.8,
    maximum * 0.6,
    maximum * 0.4,
    maximum * 0.2,
    0,
  ]
})

/* -------------------------------------------------------------------------- */
/* Statuts historique                                                         */
/* -------------------------------------------------------------------------- */

// Statut, couleurs, montant net et commission d'une transaction.
function statutTransaction(transaction) {
  const statut = transaction.statutAffiche

  const labels = {
    VERSE: 'Versé',
    REUSSI: 'Versé',
    TERMINE: 'Terminé',
    TERMINEE: 'Terminé',
    EN_ATTENTE: 'En attente',
    BLOQUE: 'Bloqué',
    BLOCAGE: 'Bloqué',
    LITIGE: 'Bloqué — litige',
    ECHOUE: 'Échoué',
    ANNULE: 'Annulé',
  }

  return labels[statut] || statut || '—'
}

function statutTransactionClasses(transaction) {
  const statut = transaction.statutAffiche

  if (
    ['VERSE', 'REUSSI'].includes(statut)
  ) {
    return 'bg-[#E2EAE4] text-[#2D6A4F]'
  }

  if (
    ['LITIGE', 'BLOQUE', 'BLOCAGE'].includes(statut)
  ) {
    return 'bg-[#F7DBDB] text-[#991B1B]'
  }

  if (
    ['TERMINE', 'TERMINEE'].includes(statut)
  ) {
    return 'bg-[#1A1C1A] text-white'
  }

  if (statut === 'ECHOUE') {
    return 'bg-[#F7DBDB] text-[#991B1B]'
  }

  return 'bg-[#F2F3F0] text-[#7A847E]'
}

function statutTransactionNet(transaction) {
  if (
    transaction.net !== undefined &&
    transaction.net !== null
  ) {
    return Number(transaction.net)
  }

  if (
    transaction.montant_net !== undefined &&
    transaction.montant_net !== null
  ) {
    return Number(transaction.montant_net)
  }

  const montant = Number(transaction.montant || 0)
  const commission = Number(transaction.commission || 0)

  if (transaction.type === 'LIBERATION') {
    return montant - commission
  }

  return montant
}

function commissionTransaction(transaction) {
  return Number(
    transaction.commission ||
    transaction.frais_commission ||
    0,
  )
}

/* -------------------------------------------------------------------------- */
/* Chargement                                                                  */
/* -------------------------------------------------------------------------- */

// Charge le wallet, les transactions et les retraits.
async function chargerDonnees() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [
      walletData,
      transactionsData,
      retraitsData,
    ] = await Promise.all([
      walletService.getMonWallet(),
      walletService.listMesTransactions(),
      walletService.listMesRetraits(),
    ])

    wallet.value = walletData

    transactions.value = Array.isArray(transactionsData)
      ? transactionsData
      : transactionsData?.results || []

    retraits.value = Array.isArray(retraitsData)
      ? retraitsData
      : retraitsData?.results || []
  } catch (error) {
    errorMessage.value =
      error?.message ||
      'Impossible de charger les données financières.'
  } finally {
    loading.value = false
  }
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

// Va à une autre page.
function changerPage(nouvellePage) {
  if (
    nouvellePage < 1 ||
    nouvellePage > totalPages.value
  ) {
    return
  }

  page.value = nouvellePage
}

// Applique un filtre de statut (et revient à la page 1).
function appliquerFiltre(statut) {
  filtreStatut.value = statut
  page.value = 1
  filtreOuvert.value = false
}

/* -------------------------------------------------------------------------- */
/* Export CSV                                                                  */
/* -------------------------------------------------------------------------- */

// Protège une valeur pour le fichier CSV (guillemets doublés).
function echapperCSV(valeur) {
  const texte = String(valeur ?? '')

  return `"${texte.replaceAll('"', '""')}"`
}

// Exporte les transactions en fichier CSV.
function exporterCSV() {
  const lignes = [
    [
      'Service',
      'Référence',
      'Date',
      'Total',
      'Commission',
      'Net',
      'Statut',
    ],
    ...transactionsFiltrees.value.map((transaction) => [
      transaction.service_nom ||
        transaction.service ||
        transaction.description ||
        '—',

      transaction.reference ||
        transaction.numero ||
        transaction.id ||
        '—',

      formaterDate(transaction.date_creation || transaction.date),

      Number(transaction.montant || 0),

      commissionTransaction(transaction),

      statutTransactionNet(transaction),

      statutTransaction(transaction),
    ]),
  ]

  const csv = lignes
    .map((ligne) =>
      ligne.map(echapperCSV).join(';'),
    )
    .join('\n')

  const blob = new Blob(
    [`\uFEFF${csv}`],
    {
      type: 'text/csv;charset=utf-8;',
    },
  )

  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')

  lien.href = url
  lien.download = 'mimosy-historique-financier.csv'
  lien.click()

  URL.revokeObjectURL(url)
}

/* -------------------------------------------------------------------------- */
/* Retrait                                                                     */
/* -------------------------------------------------------------------------- */

// Étape 1 : ouvre le formulaire de retrait vide.
function ouvrirFormulaire() {
  form.montant = ''
  form.provider = 'WAVE'
  form.destination = ''

  formulaireErreur.value = ''
  dernierRetrait.value = null

  etape.value = 'formulaire'
}

// Ferme toute la fenêtre de retrait.
function fermerFlux() {
  etape.value = 'ferme'
  dernierRetrait.value = null
  formulaireErreur.value = ''
}

// Étape 2 : vérifie le formulaire puis affiche le récapitulatif.
function allerAuRecapitulatif() {
  formulaireErreur.value = ''

  const montant = Number(form.montant)

  if (!montant || montant <= 0) {
    formulaireErreur.value =
      'Indiquez un montant supérieur à 0.'

    return
  }

  if (
    wallet.value &&
    montant > Number(wallet.value.solde_disponible)
  ) {
    formulaireErreur.value =
      'Ce montant dépasse votre solde disponible.'

    return
  }

  if (!form.destination.trim()) {
    formulaireErreur.value =
      'Indiquez le numéro qui recevra le retrait.'

    return
  }

  etape.value = 'recap'
}

// Étape 3 : envoie la demande de retrait au serveur.
async function confirmerRetrait() {
  formulaireEnvoi.value = true
  formulaireErreur.value = ''

  try {
    const retrait =
      await walletService.demanderRetrait({
        montant: form.montant,
        provider: form.provider,
        destination: form.destination,

        idempotency_key:
          `retrait-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
      })

    dernierRetrait.value = retrait
    etape.value = 'resultat'

    await chargerDonnees()
  } catch (error) {
    // Message du backend (souvent celui de PayDunya). En cas de refus, le
    // montant réservé a déjà été recrédité côté serveur : on recharge le
    // solde pour afficher la valeur réelle, jamais un calcul local.
    formulaireErreur.value =
      error?.message ||
      'Impossible de créer le retrait.'

    etape.value = 'recap'
    await chargerDonnees()
  } finally {
    formulaireEnvoi.value = false
  }
}

// On charge les données au montage.
onMounted(chargerDonnees)
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full flex-col gap-8  py-6 sm:px-6 lg:px-6 lg:py-10">

      <!-- ================================================================ -->
      <!-- EN-TÊTE -->
      <!-- ================================================================ -->

      <div class="flex flex-col gap-2">
        <h1 class="font-['Instrument_Serif'] text-[32px] leading-10 text-[#1C2420]">
          Revenus
        </h1>

        <p class="text-sm leading-6 text-[#7A847E]">
          Suivez vos gains, votre solde et vos mouvements financiers.
        </p>
      </div>

      <!-- ================================================================ -->
      <!-- CHARGEMENT / ERREUR -->
      <!-- ================================================================ -->

      <div
        v-if="loading"
        class="border border-[#E5E7E2] bg-[#FAFAF8] p-10 text-center text-sm text-[#7A847E]"
      >
        Chargement de vos données financières...
      </div>

      <div
        v-else-if="errorMessage"
        class="flex flex-col gap-4 border border-[#E5B8B2] bg-[#FFF0EE] p-5 sm:flex-row sm:items-center sm:justify-between"
        role="alert"
      >
        <p class="font-['DM_Sans'] text-sm leading-5 text-[#A85148]">
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-2 self-start font-['DM_Sans'] text-sm font-semibold text-[#A85148] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A85148] focus-visible:ring-offset-2 sm:self-auto"
          @click="chargerDonnees"
        >
          <RefreshCw class="h-4 w-4" :stroke-width="2" />
          Réessayer
        </button>
      </div>

      <template v-else>

        <!-- ============================================================ -->
        <!-- CARTES KPI -->
        <!-- ============================================================ -->

        <section class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

          <!-- Disponible -->

          <article
            class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 rounded-2xl"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium uppercase tracking-[0.7px] text-[#7A847E]">
                Disponible
              </p>

              <div class="flex h-[34px] w-[34px] items-center justify-center bg-[#E2EAE4]">
                <Wallet
                  :size="18"
                  stroke-width="1.8"
                  class="text-[#2D6A4F]"
                />
              </div>
            </div>

            <p class="mt-2 font-['Instrument_Serif'] text-[32px] leading-10 text-[#1C2420]">
              {{ formaterMontant(soldeDisponible) }}
            </p>

            <button
              type="button"
              class="mt-4 inline-flex w-full items-center justify-center gap-2 bg-[#2D6A4F] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#24573F] rounded-2xl"
              @click="ouvrirFormulaire"
            >
              Retirer l'argent

              <ArrowDownToLine :size="15" />
            </button>
          </article>

          <!-- En attente -->

          <article
            class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 rounded-2xl"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium uppercase tracking-[0.7px] text-[#7A847E]">
                En attente
              </p>

              <div class="flex h-[42px] w-[34px] items-center justify-center bg-[#F2F3F0]">
                <Clock3
                  :size="18"
                  stroke-width="1.8"
                  class="text-[#7A847E]"
                />
              </div>
            </div>

            <p class="mt-2 font-['Instrument_Serif'] text-[32px] leading-10 text-[#1C2420]">
              {{ formaterMontant(montantEnAttente) }}
            </p>

            <p class="mt-3 text-xs leading-[18px] text-[#7A847E]">
              Fonds bloqués jusqu'à la fin de l'intervention
            </p>
          </article>

          <!-- Total gagné -->

          <article
            class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 rounded-2xl"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium uppercase tracking-[0.7px] text-[#7A847E]">
                Total gagné
              </p>

              <div class="flex h-[34px] w-[34px] items-center justify-center bg-[#E2EAE4]">
                <CircleDollarSign
                  :size="18"
                  stroke-width="1.8"
                  class="text-[#2D6A4F]"
                />
              </div>
            </div>

            <p class="mt-2 font-['Instrument_Serif'] text-[32px] leading-10 text-[#1C2420]">
              {{ formaterMontant(totalGagne) }}
            </p>

            <p class="mt-3 text-xs font-medium leading-[18px] text-[#2D6A4F]">
              Gains cumulés enregistrés sur votre compte
            </p>
          </article>
        </section>

        <!-- ============================================================ -->
        <!-- FLUX RETRAIT -->
        <!-- ============================================================ -->

        <section
          v-if="etape !== 'ferme'"
          class="border border-[#E5E7E2] bg-[#FAFAF8]"
        >

          <!-- Étape formulaire -->

          <div
            v-if="etape === 'formulaire'"
            class="p-6 sm:p-8"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="font-['Instrument_Serif'] text-[24px] leading-8 text-[#1C2420]">
                  Retirer des fonds
                </h2>

                <p class="mt-1 text-sm text-[#7A847E]">
                  Choisissez le montant et le moyen de paiement.
                </p>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center border border-[#E5E7E2] text-[#7A847E] transition hover:text-[#1C2420]"
                @click="fermerFlux"
              >
                <X :size="17" />
              </button>
            </div>

            <div class="mt-6 grid gap-5 md:grid-cols-3">

              <label class="flex flex-col gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.5px] text-[#7A847E]">
                  Montant (FCFA)
                </span>

                <input
                  v-model="form.montant"
                  type="number"
                  min="1"
                  :max="wallet?.solde_disponible"
                  inputmode="numeric"
                  placeholder="10 000"
                  class="h-11 border border-[#E5E7E2] bg-white px-4 text-sm text-[#1C2420] outline-none focus:border-[#2D6A4F]"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.5px] text-[#7A847E]">
                  Moyen
                </span>

                <select
                  v-model="form.provider"
                  class="h-11 border border-[#E5E7E2] bg-white px-4 text-sm text-[#1C2420] outline-none focus:border-[#2D6A4F]"
                >
                  <option
                    v-for="moyen in MOYENS"
                    :key="moyen.value"
                    :value="moyen.value"
                  >
                    {{ moyen.label }}
                  </option>
                </select>
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.5px] text-[#7A847E]">
                  Numéro
                </span>

                <input
                  v-model="form.destination"
                  type="tel"
                  inputmode="tel"
                  placeholder="77 XXX XX XX"
                  class="h-11 border border-[#E5E7E2] bg-white px-4 text-sm text-[#1C2420] outline-none focus:border-[#2D6A4F]"
                />
              </label>
            </div>

            <p
              v-if="formulaireErreur"
              class="mt-4 flex items-center gap-2 text-sm text-[#991B1B]"
            >
              <AlertCircle :size="16" />
              {{ formulaireErreur }}
            </p>

            <button
              type="button"
              class="mt-6 bg-[#2D6A4F] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#24573F]"
              @click="allerAuRecapitulatif"
            >
              Continuer
            </button>
          </div>

          <!-- Étape récapitulatif -->

          <div
            v-else-if="etape === 'recap'"
            class="p-6 sm:p-8"
          >
            <h2 class="font-['Instrument_Serif'] text-[24px] leading-8 text-[#1C2420]">
              Vérifiez votre retrait
            </h2>

            <p class="mt-1 text-sm text-[#7A847E]">
              Vérifiez les informations avant de confirmer.
            </p>

            <dl class="mt-6 border border-[#E5E7E2] bg-white p-5">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-sm text-[#7A847E]">
                  Montant
                </dt>

                <dd class="font-['Instrument_Serif'] text-2xl text-[#1C2420]">
                  {{ formaterMontant(form.montant) }}
                </dd>
              </div>

              <div class="mt-4 flex items-center justify-between gap-4 border-t border-[#E5E7E2] pt-4">
                <dt class="text-sm text-[#7A847E]">
                  Moyen
                </dt>

                <dd class="text-sm font-medium text-[#1C2420]">
                  {{ moyenLabel }}
                </dd>
              </div>

              <div class="mt-4 flex items-center justify-between gap-4 border-t border-[#E5E7E2] pt-4">
                <dt class="text-sm text-[#7A847E]">
                  Numéro
                </dt>

                <dd class="text-sm font-medium text-[#1C2420]">
                  {{ form.destination }}
                </dd>
              </div>
            </dl>

            <p
              v-if="formulaireErreur"
              class="mt-4 text-sm text-[#991B1B]"
            >
              {{ formulaireErreur }}
            </p>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                :disabled="formulaireEnvoi"
                class="inline-flex flex-1 items-center justify-center gap-2 bg-[#2D6A4F] py-3 text-sm font-medium text-white transition hover:bg-[#24573F] disabled:opacity-60"
                @click="confirmerRetrait"
              >
                <span
                  v-if="formulaireEnvoi"
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />

                {{
                  formulaireEnvoi
                    ? 'Retrait en cours…'
                    : 'Confirmer le retrait'
                }}
              </button>

              <button
                type="button"
                :disabled="formulaireEnvoi"
                class="flex-1 border border-[#E5E7E2] py-3 text-sm font-medium text-[#1C2420] disabled:opacity-60"
                @click="etape = 'formulaire'"
              >
                Modifier
              </button>
            </div>
          </div>

          <!-- Résultat -->

          <div
            v-else-if="etape === 'resultat'"
            class="p-8 text-center"
          >
            <template
              v-if="
                dernierRetrait?.statut === 'EN_COURS' ||
                dernierRetrait?.statut === 'EN_ATTENTE'
              "
            >
              <div class="mx-auto flex h-12 w-12 items-center justify-center bg-[#DBE8F7]">
                <Clock3
                  :size="22"
                  class="text-[#3267B1]"
                />
              </div>

              <h2 class="mt-4 font-['Instrument_Serif'] text-[24px] text-[#1C2420]">
                Retrait en cours
              </h2>

              <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7A847E]">
                Votre demande a été transmise à PayDunya.
                Le solde a été pris en compte et sera recrédité
                automatiquement si le retrait échoue.
              </p>
            </template>

            <template
              v-else-if="dernierRetrait?.statut === 'SIMULE'"
            >
              <div class="mx-auto flex h-12 w-12 items-center justify-center bg-[#FFF4DB]">
                <Clock3
                  :size="22"
                  class="text-[#8A5A00]"
                />
              </div>

              <h2 class="mt-4 font-['Instrument_Serif'] text-[24px] text-[#1C2420]">
                Simulation de démonstration
              </h2>

              <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7A847E]">
                Le parcours de retrait de
                {{ formaterMontant(dernierRetrait?.montant) }}
                vers {{ dernierRetrait?.destination || form.destination }}
                a été exécuté dans MIMOSY, mais <strong>aucun déboursement PayDunya
                n'a été effectué</strong> : aucun argent n'a été envoyé sur ce numéro.
              </p>

              <p class="mt-2 text-xs text-[#7A847E]">
                Référence interne : {{ dernierRetrait?.reference_externe }}
              </p>
            </template>

            <template
              v-else-if="dernierRetrait?.statut === 'REUSSI'"
            >
              <div class="mx-auto flex h-12 w-12 items-center justify-center bg-[#E2EAE4]">
                <CheckCircle2
                  :size="24"
                  class="text-[#2D6A4F]"
                />
              </div>

              <h2 class="mt-4 font-['Instrument_Serif'] text-[24px] text-[#1C2420]">
                Retrait réussi
              </h2>

              <p class="mt-2 text-sm text-[#7A847E]">
                {{ formaterMontant(dernierRetrait?.montant) }}
                envoyé vers
                {{ dernierRetrait?.destination || form.destination }}.
              </p>
            </template>

            <template v-else>
              <div class="mx-auto flex h-12 w-12 items-center justify-center bg-[#F7DBDB]">
                <XCircle
                  :size="24"
                  class="text-[#991B1B]"
                />
              </div>

              <h2 class="mt-4 font-['Instrument_Serif'] text-[24px] text-[#1C2420]">
                Retrait échoué
              </h2>

              <p class="mt-2 text-sm text-[#7A847E]">
                Le montant sera recrédité sur votre solde disponible.
              </p>

              <button
                type="button"
                class="mt-5 bg-[#2D6A4F] px-6 py-3 text-sm font-medium text-white"
                @click="ouvrirFormulaire"
              >
                Réessayer
              </button>
            </template>

            <button
              type="button"
              class="mt-6 text-sm font-medium text-[#2D6A4F] underline"
              @click="fermerFlux"
            >
              Fermer
            </button>
          </div>
        </section>

        <!-- ============================================================ -->
        <!-- ÉVOLUTION DES GAINS -->
        <!-- ============================================================ -->

        <section
          class="border border-[#E5E7E2] bg-[#FAFAF8] p-6 sm:p-8 rounded-2xl"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="font-['Instrument_Serif'] text-[20px] leading-[30px] text-[#1C2420]">
              Évolution des gains
            </h2>

            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 bg-[#2D6A4F]" />

              <span class="text-xs text-[#7A847E]">
                Gains nets
              </span>
            </div>
          </div>

          <div
            v-if="!graphique.lignes.length"
            class="flex h-[240px] items-center justify-center text-sm text-[#7A847E]"
          >
            Aucune donnée d'évolution disponible.
          </div>

          <div
            v-else
            class="mt-6 overflow-x-auto"
          >
            <div class="relative min-w-[700px]">
              <div class="relative h-[240px]">

                <!-- Grille -->

                <div class="absolute inset-x-0 top-0 h-[210px] pl-10">
                  <div
                    v-for="(valeur, index) in graduationsGraphique"
                    :key="index"
                    class="absolute left-0 right-0 flex items-center"
                    :style="{
                      top: `${index * 20}%`,
                    }"
                  >
                    <span class="w-10 pr-2 text-right text-[10px] text-[#7A847E]">
                      {{ formaterMontantCourt(valeur) }}
                    </span>

                    <div class="h-px flex-1 bg-[#E5E7E2]" />
                  </div>
                </div>

                <!-- SVG -->

                <svg
                  viewBox="0 0 1000 210"
                  preserveAspectRatio="none"
                  class="absolute left-10 right-0 top-0 h-[210px] w-[calc(100%-40px)]"
                >
                  <polygon
                    :points="graphique.aire"
                    fill="rgba(45, 106, 79, 0.05)"
                  />

                  <polyline
                    :points="graphique.points"
                    fill="none"
                    stroke="#2D6A4F"
                    stroke-width="3"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />

                  <circle
                    v-for="point in graphique.lignes"
                    :key="`${point.date}-${point.x}`"
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                    fill="#FAFAF8"
                    stroke="#2D6A4F"
                    stroke-width="2"
                  />
                </svg>

                <!-- Dates -->

                <div class="absolute bottom-0 left-10 right-0 flex justify-between">
                  <span
                    v-for="point in graphique.lignes.filter((_, index) =>
                      index === 0 ||
                      index === graphique.lignes.length - 1 ||
                      index % Math.max(1, Math.floor(graphique.lignes.length / 5)) === 0
                    )"
                    :key="point.date"
                    class="text-[10px] text-[#7A847E]"
                  >
                    {{ formaterDate(point.date) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============================================================ -->
        <!-- HISTORIQUE FINANCIER -->
        <!-- ============================================================ -->

        <section
          class="overflow-hidden border border-[#E5E7E2] bg-[#FAFAF8] rounded-2xl"
        >

          <!-- Header -->

          <div class="flex flex-col gap-4 border-b border-[#E5E7E2] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <h2 class="font-['Instrument_Serif'] text-[20px] leading-[30px] text-[#1C2420]">
              Historique financier
            </h2>

            <div class="flex flex-wrap gap-3">

              <button
                type="button"
                class="inline-flex items-center gap-2 border border-[#E5E7E2] px-4 py-2 text-sm font-medium text-[#1C2420] transition hover:bg-[#F2F3F0]"
                @click="exporterCSV"
              >
                <Download
                  :size="14"
                  class="text-[#7A847E]"
                />

                Exporter CSV
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-2 border border-[#E5E7E2] px-4 py-2 text-sm font-medium text-[#1C2420] transition hover:bg-[#F2F3F0]"
                @click="filtreOuvert = !filtreOuvert"
              >
                <Filter
                  :size="14"
                  class="text-[#7A847E]"
                />

                Filtrer
              </button>
            </div>
          </div>

          <!-- Filtres -->

          <div
            v-if="filtreOuvert"
            class="border-b border-[#E5E7E2] bg-[#F2F3F0]/30 p-4"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="filtre in [
                  { value: 'TOUS', label: 'Tous' },
                  { value: 'VERSE', label: 'Versés' },
                  { value: 'EN_ATTENTE', label: 'En attente' },
                  { value: 'TERMINE', label: 'Terminés' },
                  { value: 'LITIGE', label: 'Litiges' },
                  { value: 'BLOQUE', label: 'Bloqués' },
                ]"
                :key="filtre.value"
                type="button"
                class="border px-4 py-2 text-xs font-medium transition"
                :class="
                  filtreStatut === filtre.value
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                    : 'border-[#E5E7E2] bg-white text-[#7A847E] hover:text-[#1C2420]'
                "
                @click="appliquerFiltre(filtre.value)"
              >
                {{ filtre.label }}
              </button>
            </div>
          </div>

          <!-- Table desktop -->

          <div
            v-if="transactionsPaginees.length"
            class="hidden overflow-x-auto lg:block"
          >
            <table class="w-full min-w-[950px] border-collapse">
              <thead>
                <tr class="border-b border-[#E5E7E2] bg-[#F2F3F0]/30">
                  <th class="px-8 py-4 text-left text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Service
                  </th>

                  <th class="px-8 py-4 text-left text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Date
                  </th>

                  <th class="px-8 py-4 text-left text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Total (FCFA)
                  </th>

                  <th class="px-8 py-4 text-left text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Commission
                  </th>

                  <th class="px-8 py-4 text-right text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Net
                  </th>

                  <th class="px-8 py-4 text-right text-xs font-medium uppercase tracking-[0.6px] text-[#7A847E]">
                    Statut
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="transaction in transactionsPaginees"
                  :key="transaction.id"
                  class="border-b border-[#E5E7E2] last:border-b-0"
                >
                  <td class="px-8 py-5">
                    <p class="text-sm font-semibold text-[#1C2420]">
                      {{
                        transaction.service_nom ||
                        transaction.service ||
                        transaction.description ||
                        'Transaction'
                      }}
                    </p>

                    <p class="mt-1 text-xs text-[#7A847E]">
                      Réf:
                      {{
                        transaction.reference ||
                        transaction.numero ||
                        transaction.id ||
                        '—'
                      }}
                    </p>
                  </td>

                  <td class="whitespace-nowrap px-8 py-5 text-sm text-[#1C2420]">
                    {{
                      formaterDate(
                        transaction.date_creation ||
                        transaction.date
                      )
                    }}
                  </td>

                  <td class="whitespace-nowrap px-8 py-5 text-sm text-[#1C2420]">
                    {{ formaterMontantCourt(transaction.montant) }}
                  </td>

                  <td class="whitespace-nowrap px-8 py-5 text-sm text-[#7A847E]">
                    {{
                      commissionTransaction(transaction) > 0
                        ? `-${formaterMontantCourt(commissionTransaction(transaction))}`
                        : '—'
                    }}
                  </td>

                  <td
                    class="whitespace-nowrap px-8 py-5 text-right text-sm font-bold"
                    :class="
                      transaction.statutAffiche === 'VERSE'
                        ? 'text-[#2D6A4F]'
                        : 'text-[#1C2420]'
                    "
                  >
                    {{ formaterMontantCourt(statutTransactionNet(transaction)) }}
                  </td>

                  <td class="px-8 py-5 text-right">
                    <span
                      class="inline-flex px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1px]"
                      :class="statutTransactionClasses(transaction)"
                    >
                      {{ statutTransaction(transaction) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cards mobile/tablette -->

          <div
            v-if="transactionsPaginees.length"
            class="divide-y divide-[#E5E7E2] lg:hidden"
          >
            <article
              v-for="transaction in transactionsPaginees"
              :key="transaction.id"
              class="p-5"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-[#1C2420]">
                    {{
                      transaction.service_nom ||
                      transaction.service ||
                      transaction.description ||
                      'Transaction'
                    }}
                  </h3>

                  <p class="mt-1 text-xs text-[#7A847E]">
                    Réf:
                    {{
                      transaction.reference ||
                      transaction.numero ||
                      transaction.id ||
                      '—'
                    }}
                  </p>
                </div>

                <span
                  class="shrink-0 px-2 py-1 text-[10px] font-bold uppercase"
                  :class="statutTransactionClasses(transaction)"
                >
                  {{ statutTransaction(transaction) }}
                </span>
              </div>

              <div class="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-[#7A847E]">
                    Date
                  </p>

                  <p class="mt-1 text-sm text-[#1C2420]">
                    {{
                      formaterDate(
                        transaction.date_creation ||
                        transaction.date
                      )
                    }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-[#7A847E]">
                    Total
                  </p>

                  <p class="mt-1 text-sm text-[#1C2420]">
                    {{ formaterMontantCourt(transaction.montant) }}
                    FCFA
                  </p>
                </div>

                <div>
                  <p class="text-xs text-[#7A847E]">
                    Commission
                  </p>

                  <p class="mt-1 text-sm text-[#7A847E]">
                    {{
                      commissionTransaction(transaction) > 0
                        ? `-${formaterMontantCourt(commissionTransaction(transaction))}`
                        : '—'
                    }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-[#7A847E]">
                    Net
                  </p>

                  <p class="mt-1 text-sm font-bold text-[#2D6A4F]">
                    {{ formaterMontantCourt(statutTransactionNet(transaction)) }}
                    FCFA
                  </p>
                </div>
              </div>
            </article>
          </div>

          <EmptyState
            v-if="!transactionsPaginees.length"
            class="m-6"
            title="Aucune transaction"
            message="Vos mouvements financiers apparaîtront ici."
          />

          <!-- Pagination -->

          <div
            v-if="transactionsFiltrees.length"
            class="flex flex-col gap-4 bg-[#F2F3F0]/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <p class="text-sm text-[#7A847E]">
              Affichage de
              {{ debutAffichage }}
              à
              {{ finAffichage }}
              sur
              {{ transactionsFiltrees.length }}
              transactions
            </p>

            <div class="flex items-center gap-2">

              <button
                type="button"
                :disabled="page === 1"
                class="flex h-9 w-9 items-center justify-center border border-[#E5E7E2] text-[#1C2420] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                @click="changerPage(page - 1)"
              >
                <ChevronLeft :size="16" />
              </button>

              <button
                v-for="numeroPage in pagesVisibles"
                :key="numeroPage"
                type="button"
                class="flex h-9 w-9 items-center justify-center border text-sm transition"
                :class="
                  page === numeroPage
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                    : 'border-[#E5E7E2] bg-white text-[#1C2420] hover:bg-[#F2F3F0]'
                "
                @click="changerPage(numeroPage)"
              >
                {{ numeroPage }}
              </button>

              <button
                type="button"
                :disabled="page === totalPages"
                class="flex h-9 w-9 items-center justify-center border border-[#E5E7E2] text-[#1C2420] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                @click="changerPage(page + 1)"
              >
                <ChevronRight :size="16" />
              </button>

            </div>
          </div>
        </section>

        <!-- ============================================================ -->
        <!-- RETRAITS -->
        <!-- ============================================================ -->

        <section
          class="border border-[#E5E7E2] bg-[#FAFAF8] rounded-2xl"
        >
          <div class="border-b border-[#E5E7E2] p-6">
            <h2 class="font-['Instrument_Serif'] text-[20px] leading-[30px] text-[#1C2420]">
              Historique des retraits
            </h2>
          </div>

          <EmptyState
            v-if="!retraits.length"
            class="m-6"
            title="Aucun retrait"
            message="Vos demandes de retrait apparaîtront ici."
          />

          <div
            v-else
            class="divide-y divide-[#E5E7E2]"
          >
            <div
              v-for="retrait in retraits"
              :key="retrait.id"
              class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="text-sm font-semibold text-[#1C2420]">
                  {{ formaterMontant(retrait.montant) }}
                </p>

                <p class="mt-1 text-xs text-[#7A847E]">
                  {{ retrait.provider || 'Moyen de paiement' }}
                  ·
                  {{ retrait.destination || '—' }}
                  ·
                  {{ formaterDateComplete(retrait.date_creation) }}
                </p>
              </div>

              <span
                class="w-fit px-2 py-1 text-[11px] font-bold uppercase"
                :class="
                  statutRetraitCouleur[retrait.statut] ||
                  'bg-[#F2F3F0] text-[#7A847E]'
                "
              >
                {{
                  statutRetraitLabels[retrait.statut] ||
                  retrait.statut ||
                  '—'
                }}
              </span>
            </div>
          </div>
        </section>

      </template>
    </div>
  </AppLayout>
</template>