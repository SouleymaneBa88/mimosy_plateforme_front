<script setup>
/**
 * ─────────────────────────────────────────────────────────────
 * Page : Détail d'une demande de prestation
 * ─────────────────────────────────────────────────────────────
 * Disposition reprise de front_mimosy/src/views/clients/DetailsDemande.vue
 * (cartes séparées : infos, suivi, prestataire, paiement, actions) — la
 * logique ci-dessous est inchangée : paiement PayDunya + vérification
 * serveur, litige bloquant, avis, annulation.
 * ─────────────────────────────────────────────────────────────
 */

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MessageCircle, TriangleAlert } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import NouveauLitigeModal from '@/components/disputes/NouveauLitigeModal.vue'
import PaiementModal from '@/components/client/PaiementModal.vue'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'
import { useToast } from '@/composables/useToast'
import { creerAvis } from '@/services/avisService'
import * as walletService from '@/services/walletService'
import * as disputeService from '@/services/disputeService'

const route = useRoute()
const router = useRouter()

const demandeStore = useDemandePrestationStore()
const prestataireStore = usePrestataireStore()

/* ───────────────────────── Paiement ───────────────────────── */

const paiement = ref(null)
const paiementLoading = ref(false)
const paiementError = ref('')

/**
 * Le bouton de paiement reste visible tant que la demande (acceptée)
 * n'est pas payée. C'est le BACKEND qui décide quoi faire à chaque clic
 * (voir apps.wallet.services.initier_paiement) :
 *   - aucune tentative ou ECHOUE → nouvelle facture PayDunya ;
 *   - EN_ATTENTE                 → la même facture est renvoyée (« Reprendre ») ;
 *   - INITIE                     → facture en cours de création, rien de nouveau.
 */
const peutPayer = computed(() => demande.value?.statut === 'ACCEPTEE' && paiement.value?.statut !== 'REUSSI')

const libelleBoutonPaiement = computed(() => {
  if (paiementLoading.value) return 'Préparation du paiement…'
  const montant = `${Number(demande.value?.budget || 0).toLocaleString('fr-FR')} FCFA`
  if (paiement.value?.statut === 'EN_ATTENTE') return 'Reprendre le paiement'
  if (paiement.value?.statut === 'INITIE') return 'Actualiser'
  if (paiement.value?.statut === 'ECHOUE') return `Réessayer (${montant})`
  return `Payer ${montant}`
})

const verificationLoading = ref(false)

/**
 * « Payer » et « Reprendre le paiement » ouvrent la modal de paiement
 * (components/client/PaiementModal.vue) : le client y choisit Wave ou
 * Orange Money et son numéro, puis la modal redirige vers la page de
 * paiement renvoyée par le backend. Aucun montant n'est envoyé.
 */
const modalPaiementOuverte = ref(false)

function payer() {
  if (!demande.value?.id) return
  paiementError.value = ''
  modalPaiementOuverte.value = true
}

// Résultat sans redirection (ex. fournisseur sandbox MIMOSY : REUSSI immédiat,
// ou paiement encore en préparation) : on met simplement la carte à jour.
function onResultatPaiement(resultat) {
  if (resultat) paiement.value = resultat
}

/**
 * Vérifie le statut réel d'un paiement EN_ATTENTE (ex. le client est
 * revenu sur cette page sans passer par /client/paiement/retour, ou
 * a laissé la page ouverte pendant qu'il payait dans un autre onglet).
 * Interroge toujours le backend, jamais un statut supposé côté client.
 */
async function verifierPaiement() {
  if (!paiement.value?.id) return

  verificationLoading.value = true
  paiementError.value = ''
  try {
    paiement.value = await walletService.getStatutPaiement(paiement.value.id)
  } catch (error) {
    paiementError.value = error.message
  } finally {
    verificationLoading.value = false
  }
}

async function chargerPaiement() {
  try {
    const paiements = (await walletService.listMesPaiements()).filter(
      (item) => item.demande_prestation === demande.value?.id,
    )
    // Plusieurs tentatives peuvent exister (échouées, payée en double...) :
    // on affiche la plus significative, pas simplement la plus récente.
    const priorite = ['REUSSI', 'EN_ATTENTE', 'INITIE', 'A_REMBOURSER']
    paiement.value =
      priorite.map((statut) => paiements.find((item) => item.statut === statut)).find(Boolean) || paiements[0] || null
  } catch {
    // Silencieux : l'absence de paiement affiché n'empêche pas de consulter la demande.
  }
}

/* ───────────────────────── Litige ouvert sur cette demande ───────────────────────── */

// Tant qu'un litige est ouvert sur cette demande, le paiement ne doit
// jamais être présenté comme normalement acquis au prestataire : voir
// litigeBloquant ci-dessous, qui remplace le bandeau de paiement usuel.
const litigeBloquant = ref(null)

async function chargerLitigeLie() {
  try {
    const data = await disputeService.listMesLitiges()
    const litiges = Array.isArray(data) ? data : data?.results || []
    litigeBloquant.value =
      litiges.find(
        (item) => item.demande_prestation === demande.value?.id && item.fonds_geles && !['RESOLU', 'REJETE'].includes(item.statut),
      ) || null
  } catch {
    // Silencieux : l'absence d'information sur un litige n'empêche pas de consulter la demande.
  }
}

/** La demande actuellement affichée (issue du store). */
const demande = computed(() => demandeStore.demandeSelectionnee)

/** Le prestataire lié à la demande (issu du store). */
const prestataire = computed(() => prestataireStore.prestataireSelectionne)

const nomPrestataire = computed(() =>
  prestataire.value
    ? `${prestataire.value.user_first_name || ''} ${prestataire.value.user_last_name || ''}`.trim() || prestataire.value.user_email || 'Prestataire'
    : 'Chargement…',
)

/* ───────────────────────── États des modales ───────────────────────── */

const cancelOpen = ref(false)

const avisOpen = ref(false)
const avisNote = ref(0)
const avisCommentaire = ref('')
const avisLoading = ref(false)
const avisError = ref('')
const avisSuccess = ref('')

/* ───────────────────────── Configuration des statuts ───────────────────────── */

/**
 * Table de correspondance statut → apparence (libellé + couleurs).
 * Permet de garder une seule source de vérité pour le style des badges.
 */
const statutConfig = {
  EN_ATTENTE: { label: 'En attente', fond: 'var(--color-mimosy-blueBg)', texte: 'var(--color-mimosy-blue)' },
  ACCEPTEE: { label: 'Acceptée', fond: 'var(--color-mimosy-primaryBg)', texte: 'var(--color-mimosy-primary)' },
  REFUSEE: { label: 'Refusée', fond: '#FFF0EE', texte: '#C53B35' },
  TERMINEE: { label: 'Terminée', fond: 'var(--color-mimosy-primaryBg)', texte: 'var(--color-mimosy-primary)' },
  ANNULEE: { label: 'Annulée', fond: '#FFF0EE', texte: '#C53B35' },
}

/** Renvoie la config du statut courant, avec repli sur "En attente". */
const statutActuel = computed(() => {
  return statutConfig[demande.value?.statut] || statutConfig.EN_ATTENTE
})

/* ───────────────────────── Dates formatées ───────────────────────── */

const dateCreation = computed(() => formatDate(demande.value?.date_creation))
const dateSouhaitee = computed(() => formatDate(demande.value?.date_souhaitee))

/**
 * Formate une date ISO en date/heure lisible (locale fr-FR).
 * @param {string|null} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return 'Non renseignée'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date invalide'

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ───────────────────────── Règles d'affichage des actions ───────────────────────── */

/** La demande peut être annulée tant qu'elle est en attente ou acceptée. */
const canCancel = computed(() => {
  return ['EN_ATTENTE', 'ACCEPTEE'].includes(demande.value?.statut)
})

/** On ne peut laisser un avis que sur une prestation terminée, et pas deux fois (voir demande.a_un_avis, calculé côté backend). */
const peutDonnerAvis = computed(() => {
  return demande.value?.statut === 'TERMINEE' && !demande.value?.a_un_avis
})

/**
 * Un litige n'a de sens que sur un engagement réel (demande acceptée
 * ou terminée) : pas sur une demande encore en attente, refusée ou
 * annulée, où il n'y a rien à contester.
 */
const peutOuvrirLitige = computed(() => {
  return ['ACCEPTEE', 'TERMINEE'].includes(demande.value?.statut)
})

const litigeModalOuvert = ref(false)
const { succes } = useToast()

function litigeCree() {
  succes('Votre litige a été envoyé à MIMOSY.')
}

/* ───────────────────────── Timeline de suivi ───────────────────────── */

/**
 * Construit les 3 étapes de la timeline en fonction du statut courant.
 * `done`   → l'étape est atteinte ou dépassée
 * `active` → l'étape est l'état actuel de la demande
 */
const progressSteps = computed(() => {
  const status = demande.value?.statut
  const order = ['EN_ATTENTE', 'ACCEPTEE', 'TERMINEE']
  const currentIndex = order.indexOf(status)

  return [
    { key: 'EN_ATTENTE', label: 'Demande envoyée', done: currentIndex >= 0, active: status === 'EN_ATTENTE' },
    { key: 'ACCEPTEE', label: 'Demande acceptée', done: currentIndex >= 1, active: status === 'ACCEPTEE' },
    { key: 'TERMINEE', label: 'Prestation terminée', done: currentIndex >= 2, active: status === 'TERMINEE' },
  ]
})

/* ───────────────────────── Navigation / messagerie ───────────────────────── */

/**
 * Redirige vers la messagerie avec le profil du prestataire.
 *
 * Important :
 * On envoie l'ID du ProfilPrestataire, pas l'ID du compte User.
 * Le backend fera ensuite : ProfilPrestataire → profil.user → Message.destinataire
 */
function ouvrirDiscussion() {
  if (!prestataire.value) {
    console.error('Prestataire introuvable.')
    return
  }

  const profilPrestataireId = prestataire.value.id
  if (!profilPrestataireId) {
    console.error('ID du profil prestataire introuvable.', prestataire.value)
    return
  }

  const nom =
    `${prestataire.value.user_first_name || ''} ${prestataire.value.user_last_name || ''}`.trim() ||
    prestataire.value.user_email ||
    'Prestataire'

  const avatar =
    prestataire.value.profile_photo ||
    prestataire.value.photo_profil ||
    prestataire.value.photo ||
    ''

  const service =
    demande.value?.service_nom ||
    demande.value?.service?.nom ||
    demande.value?.service_name ||
    ''

  router.push({
    path: '/messages',
    query: {
      prestataire: String(profilPrestataireId),
      nom,
      avatar,
      service,
    },
  })
}

/**
 * Retour contextuel vers "Mes demandes" (jamais router.back(), dont la
 * destination dépendrait de l'historique de navigation et serait donc
 * imprévisible si la page est ouverte via un lien direct).
 */
function retour() {
  router.push({ name: 'demandes' })
}

/* ───────────────────────── Chargement initial ───────────────────────── */

onMounted(() => {
  demandeStore
    .chargerDemande(route.params.id)
    .then((data) => {
      // Une fois la demande chargée, on charge le prestataire associé
      // (si la demande en référence un).
      if (data?.prestataire) {
        return prestataireStore.chargerPrestataire(data.prestataire)
      }
      return null
    })
    .then(chargerPaiement)
    .then(chargerLitigeLie)
    .catch((error) => {
      console.error('Erreur lors du chargement de la demande :', error)
    })
})

/* ───────────────────────── Annulation de la demande ───────────────────────── */

async function annulerDemande() {
  if (!demande.value?.id) return

  try {
    await demandeStore.annulerDemande(demande.value.id)
    cancelOpen.value = false
  } catch {
    // Le message d'erreur est géré et affiché par le store.
  }
}

/* ───────────────────────── Gestion de l'avis ───────────────────────── */

/** Ouvre la modale d'avis en réinitialisant son état. */
function ouvrirAvis() {
  avisError.value = ''
  avisSuccess.value = ''
  avisNote.value = 0
  avisCommentaire.value = ''
  avisOpen.value = true
}

/** Ferme la modale d'avis (sauf pendant un envoi en cours). */
function fermerAvis() {
  if (avisLoading.value) return

  avisOpen.value = false
  avisError.value = ''
}

/** Valide puis envoie l'avis (note + commentaire) au backend. */
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

    avisSuccess.value = 'Votre avis a été enregistré avec succès.'
    avisOpen.value = false
    avisNote.value = 0
    avisCommentaire.value = ''
    if (demande.value) demande.value.a_un_avis = true
  } catch (error) {
    console.error('Erreur lors de l’envoi de l’avis :', error)
    avisError.value = error?.message || 'Impossible d’enregistrer votre avis.'
  } finally {
    avisLoading.value = false
  }
}
</script>

<template>
  <ClientLayout>
    <section class="mx-auto w-full max-w-[100%] px-4 py-10 sm:px-8 sm:py-12 ">
      <!-- ═══════════════ État : chargement ═══════════════ -->
      <div v-if="demandeStore.isLoading" class="animate-pulse space-y-6">
        <div class="h-8 w-1/3 rounded-lg bg-mimosy-page"></div>
        <div class="h-40 rounded-[24px] bg-mimosy-page"></div>
        <div class="h-32 rounded-[24px] bg-mimosy-page"></div>
      </div>

      <!-- ═══════════════ État : erreur ═══════════════ -->
      <div v-else-if="demandeStore.errorMessage" class="rounded-[24px] border border-[#a85148] bg-[#fbeeec] p-8 text-center font-sans text-sm font-semibold text-[#a85148]">
        {{ demandeStore.errorMessage }}
      </div>

      <!-- ═══════════════ Contenu principal ═══════════════ -->
      <template v-else-if="demande">
        <button type="button" class="flex items-center gap-1.5 font-sans text-sm font-medium text-mimosy-secondary transition hover:text-mimosy-text" @click="retour">
          <ArrowLeft :size="16" :stroke-width="1.8" />
          Retour aux demandes
        </button>

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <!-- Carte 1 : en-tête + informations de la demande -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">
                    {{ demande.service_nom || demande.service?.nom || demande.service_name || 'Demande' }}
                  </h1>
                  <p class="mt-1 font-sans text-xs text-mimosy-secondary">Demande #{{ demande.id }} · Créée le {{ dateCreation }}</p>
                </div>
                <span class="shrink-0 rounded-full px-3 py-1.5 font-sans text-xs font-bold whitespace-nowrap" :style="{ background: statutActuel.fond, color: statutActuel.texte }">
                  {{ statutActuel.label }}
                </span>
              </div>

              <p class="mt-5 font-sans text-sm leading-relaxed text-mimosy-secondary">{{ demande.description || 'Aucune description.' }}</p>

              <div class="mt-6 grid grid-cols-1 gap-5 border-t border-mimosy-border pt-6 sm:grid-cols-2">
                <div>
                  <p class="font-sans text-[10px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Date souhaitée</p>
                  <p class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ dateSouhaitee }}</p>
                </div>
                <div>
                  <p class="font-sans text-[10px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Budget</p>
                  <p class="mt-1 font-sans text-sm font-bold text-mimosy-primary">{{ Number(demande.budget || 0).toLocaleString('fr-FR') }} FCFA</p>
                </div>
              </div>
            </section>

            <!-- Carte 2 : suivi de la demande -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <h2 class="font-sans text-base font-bold text-mimosy-text">Suivi de la demande</h2>

              <div class="mt-6 flex flex-col gap-6 sm:flex-row sm:gap-0">
                <div v-for="(step, index) in progressSteps" :key="step.key" class="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                  <span
                    v-if="index < progressSteps.length - 1"
                    class="absolute left-[17px] top-9 h-6 w-0.5 sm:left-1/2 sm:top-[17px] sm:h-0.5 sm:w-full sm:translate-x-[17px]"
                    :class="step.done ? 'bg-mimosy-primary' : 'bg-mimosy-page'"
                  ></span>
                  <span
                    class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-extrabold"
                    :class="step.done ? 'bg-mimosy-primary text-white' : 'bg-mimosy-page text-mimosy-secondary'"
                  >
                    {{ step.done ? '✓' : '•' }}
                  </span>
                  <span class="font-sans text-sm font-bold" :class="step.active ? 'text-mimosy-primary' : 'text-mimosy-secondary'">{{ step.label }}</span>
                </div>
              </div>
            </section>

            <!-- Carte 3 : statut du paiement (si engagé, ou premier paiement possible : peutPayer) -->
            <section v-if="litigeBloquant || paiement || peutPayer" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Paiement</h2>

              <div v-if="litigeBloquant" class="mt-3 rounded-xl bg-[#FFFBF0] px-4 py-3 font-sans text-sm font-semibold text-[#9A723C]">
                Paiement sécurisé — {{ Number(litigeBloquant.montant_concerne || 0).toLocaleString('fr-FR') }} FCFA restent
                bloqués pendant le traitement du litige en cours. Le prestataire n'a pas reçu cet argent.
              </div>
              <div v-else-if="paiement?.statut === 'REUSSI'" class="mt-3 rounded-xl bg-mimosy-primaryBg px-4 py-3 font-sans text-sm font-semibold text-mimosy-primary">
                {{ Number(paiement.montant).toLocaleString('fr-FR') }} FCFA payés. Les fonds seront crédités au prestataire une fois la prestation terminée.
              </div>
              <div v-else-if="paiement?.statut === 'EN_ATTENTE'" class="mt-3 flex items-center gap-3 rounded-xl bg-[#EDF4FF] px-4 py-3 font-sans text-sm font-semibold text-[#3267B1]">
                <span class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#3267B1]/30 border-t-[#3267B1]" aria-hidden="true" />
                Paiement en attente chez PayDunya. Si vous avez quitté la page de paiement, vous pouvez la reprendre.
              </div>
              <div v-else-if="paiement?.statut === 'INITIE'" class="mt-3 flex items-center gap-3 rounded-xl bg-[#EDF4FF] px-4 py-3 font-sans text-sm font-semibold text-[#3267B1]">
                <span class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#3267B1]/30 border-t-[#3267B1]" aria-hidden="true" />
                Paiement en cours de préparation…
              </div>
              <div v-else-if="paiement?.statut === 'A_REMBOURSER'" class="mt-3 rounded-xl bg-[#FFFBF0] px-4 py-3 font-sans text-sm font-semibold text-[#9A723C]">
                Un paiement en double a été détecté. Il n'a pas été appliqué et vous sera remboursé par l'équipe MIMOSY.
              </div>
              <div v-else-if="paiement?.statut === 'ECHOUE'" class="mt-3 rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm font-semibold text-[#A85148]">
                Le paiement n'a pas abouti. Vous pouvez réessayer.
              </div>
              <p v-if="paiementError" class="mt-2 font-sans text-sm font-bold text-[#A85148]">{{ paiementError }}</p>

              <PaiementModal
                v-if="demande"
                v-model="modalPaiementOuverte"
                :demande="demande"
                :paiement-en-cours="paiement?.statut === 'EN_ATTENTE' ? paiement : null"
                @resultat="onResultatPaiement"
              />

              <div class="mt-4 flex flex-wrap gap-2.5">
                <button
                  v-if="peutPayer"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  :disabled="paiementLoading"
                  @click="payer"
                >
                  <span v-if="paiementLoading" class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  {{ libelleBoutonPaiement }}
                </button>
                <button
                  v-if="paiement?.statut === 'EN_ATTENTE'"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border border-mimosy-primary bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-primary transition hover:bg-mimosy-primaryBg disabled:opacity-60"
                  :disabled="verificationLoading"
                  @click="verifierPaiement"
                >
                  {{ verificationLoading ? 'Vérification…' : 'Vérifier mon paiement' }}
                </button>
              </div>
            </section>
          </div>

          <!-- Colonne latérale -->
          <div class="flex flex-col gap-6">
            <!-- Carte : prestataire -->
            <section v-if="prestataire" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Prestataire</h2>
              <div class="mt-4 flex items-center gap-3 p-5">
                <img v-if="prestataire.photo" :src="prestataire.photo" :alt="`Photo de ${nomPrestataire}`" class="h-12 w-12 shrink-0 rounded-full object-cover p-5" />
                <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mimosy-primaryBg font-serif text-lg text-mimosy-primary mx-2">{{ nomPrestataire.charAt(0) }}</div>
                <div class="min-w-0">
                  <p class="truncate font-sans text-sm font-bold text-mimosy-text">{{ nomPrestataire }}</p>
                </div>
              </div>
              <router-link
                :to="{ name: 'client.prestataire', params: { id: prestataire.id } }"
                class="mt-4 flex w-full items-center justify-center rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary"
              >
                Voir le profil
              </router-link>
            </section>

            <!-- Carte : actions -->
            <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
              <h2 class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Actions</h2>

              <transition name="fade">
                <div v-if="avisSuccess" class="mt-3 rounded-xl border border-mimosy-primary bg-mimosy-primaryBg px-4 py-3 font-sans text-sm font-bold text-mimosy-primary">{{ avisSuccess }}</div>
              </transition>

              <div class="mt-3 flex flex-col gap-2.5">
                <button v-if="peutDonnerAvis" type="button" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="ouvrirAvis">
                  Donner mon avis
                </button>
                <span v-else-if="demande.statut === 'TERMINEE' && demande.a_un_avis" class="rounded-xl border border-mimosy-border bg-mimosy-page px-4 py-2.5 text-center font-sans text-sm font-bold text-mimosy-secondary">
                  Avis déjà envoyé
                </span>

                <button
                  v-if="prestataire"
                  type="button"
                  class="flex items-center justify-center gap-2 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary"
                  @click="ouvrirDiscussion"
                >
                  <MessageCircle :size="16" :stroke-width="1.8" />
                  Contacter le prestataire
                </button>

                <button v-if="canCancel" type="button" class="rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE]" @click="cancelOpen = true">
                  Annuler la demande
                </button>

                <button
                  v-if="peutOuvrirLitige"
                  type="button"
                  class="flex items-center justify-center gap-2 rounded-xl border border-[#FBE1DD] bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE]"
                  @click="litigeModalOuvert = true"
                >
                  <TriangleAlert :size="16" :stroke-width="1.8" />
                  Signaler un litige
                </button>
              </div>
            </section>
          </div>
        </div>
      </template>

      <!-- ═══════════════ État : demande introuvable ═══════════════ -->
      <div v-else class="rounded-[24px] border border-dashed border-mimosy-border bg-mimosy-surface p-10 text-center font-sans text-sm text-mimosy-secondary">
        Demande introuvable.
      </div>
    </section>

    <!-- ═══════════════ Modales ═══════════════ -->
    <Teleport to="body">
      <!-- ── Modale : confirmation d'annulation ── -->
      <transition name="fade">
        <div v-if="cancelOpen" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 p-4" @click.self="cancelOpen = false">
          <div class="w-full max-w-md rounded-[24px] bg-mimosy-surface p-6 shadow-xl">
            <h2 class="font-serif text-lg text-mimosy-text">Annuler cette demande ?</h2>
            <p class="mt-2 font-sans text-sm leading-6 text-mimosy-secondary">Cette action changera le statut de la demande en « Annulée ».</p>
            <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" class="rounded-xl border border-mimosy-border px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page" @click="cancelOpen = false">
                Retour
              </button>
              <button type="button" class="rounded-xl bg-[#A85148] px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-[#8F4038] disabled:opacity-50" :disabled="demandeStore.isLoading" @click="annulerDemande">
                {{ demandeStore.isLoading ? 'Annulation...' : 'Confirmer' }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- ── Modale : dépôt d'un avis ── -->
      <transition name="fade">
        <div v-if="avisOpen" class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 p-4" @click.self="fermerAvis">
          <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-[24px] bg-mimosy-surface p-6 shadow-xl">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-sans text-xs font-bold uppercase tracking-wide text-mimosy-primary">Votre expérience</p>
                <h2 class="mt-1 font-serif text-xl text-mimosy-text">Donner votre avis</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Évaluez la prestation réalisée par le prestataire.</p>
              </div>
              <button type="button" class="shrink-0 text-xl text-mimosy-secondary transition hover:text-mimosy-text" aria-label="Fermer" :disabled="avisLoading" @click="fermerAvis">×</button>
            </div>

            <div class="mt-6">
              <p class="font-sans text-sm font-bold text-mimosy-text">Votre note</p>
              <div class="mt-3 flex gap-2">
                <button
                  v-for="note in 5"
                  :key="note"
                  type="button"
                  class="text-3xl leading-none transition hover:scale-110"
                  :class="note <= avisNote ? 'text-mimosy-primary' : 'text-mimosy-border'"
                  :aria-label="`${note} étoile${note > 1 ? 's' : ''}`"
                  @click="avisNote = note"
                >
                  ★
                </button>
              </div>
              <p v-if="avisNote" class="mt-2 font-sans text-sm font-bold text-mimosy-primary">{{ avisNote }}/5</p>
            </div>

            <div class="mt-6">
              <label for="avis-commentaire" class="font-sans text-sm font-bold text-mimosy-text">Commentaire</label>
              <textarea
                id="avis-commentaire"
                v-model="avisCommentaire"
                rows="5"
                maxlength="1000"
                class="mt-2 w-full rounded-xl border border-mimosy-border px-4 py-3 font-sans text-sm text-mimosy-text outline-none transition focus:border-mimosy-primary"
                placeholder="Partagez votre expérience..."
                :disabled="avisLoading"
              />
              <p class="mt-1 text-right font-sans text-xs text-mimosy-secondary">{{ avisCommentaire.length }}/1000</p>
            </div>

            <p v-if="avisError" class="mt-3 rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm text-[#A85148]">{{ avisError }}</p>

            <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" class="rounded-xl border border-mimosy-border px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page" :disabled="avisLoading" @click="fermerAvis">
                Annuler
              </button>
              <button
                type="button"
                class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="avisLoading || avisNote === 0 || !avisCommentaire.trim()"
                @click="envoyerAvis"
              >
                {{ avisLoading ? 'Envoi...' : 'Publier mon avis' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <NouveauLitigeModal v-model="litigeModalOuvert" :demande="demande" role="CLIENT" @cree="litigeCree" />
  </ClientLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
