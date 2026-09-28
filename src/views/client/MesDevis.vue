<script setup>
/**
 * Mes devis (client) : demandes de devis, devis détaillés reçus, puis tout
 * le parcours après acceptation.
 *
 *   Devis reçu → accepter / refuser → Payer (modal PayDunya existante)
 *   → paiement confirmé (facture) → prestation → validation → avis
 *
 * Aucune règle financière ici : les montants viennent du backend, et le
 * statut du paiement n'est jamais supposé côté navigateur (il vient de
 * reponse.paiement, calculé par l'API). La réalisation, la validation et
 * l'avis se font sur la page de la demande de prestation créée à
 * l'acceptation, exactement comme pour une demande de prestation classique.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { CheckCircle2, FileText, MessageSquare, Receipt, XCircle } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import DevisDetail from '@/components/devis/DevisDetail.vue'
import PaiementModal from '@/components/client/PaiementModal.vue'
import { useToast } from '@/composables/useToast'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'
import * as devisService from '@/services/devisService'

const { succes } = useToast()

const demandes = ref([])
const reponses = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// Regroupe les réponses par demande (clé étrangère "reponse.demande").
const reponsesParDemande = computed(() => {
  const grouped = new Map()
  reponses.value.forEach((reponse) => {
    if (!grouped.has(reponse.demande)) grouped.set(reponse.demande, [])
    grouped.get(reponse.demande).push(reponse)
  })
  return grouped
})

function fcfa(valeur) {
  return `${Number(valeur || 0).toLocaleString('fr-FR')} FCFA`
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ─────────────── Statuts humains ─────────────── */

const TONS = {
  attente: { bg: 'var(--color-mimosy-blueBg)', color: 'var(--color-mimosy-blue)' },
  succes: { bg: 'var(--color-mimosy-primaryBg)', color: 'var(--color-mimosy-primary)' },
  alerte: { bg: '#FFF7E6', color: '#9A723C' },
  erreur: { bg: '#FFF0EE', color: '#C53B35' },
  neutre: { bg: 'var(--color-mimosy-grayBg)', color: 'var(--color-mimosy-gray)' },
}

function reponseAcceptee(demande) {
  return (reponsesParDemande.value.get(demande.id) || []).find((r) => r.statut === 'ACCEPTEE') || null
}

/**
 * Étape « humaine » d'une réponse acceptée, à partir de ce que renvoie
 * l'API (statut du paiement et de la prestation) : jamais de constante
 * technique affichée telle quelle.
 */
function etapeApresAcceptation(reponse) {
  const paiement = reponse.paiement?.statut
  if (paiement === 'REUSSI') {
    return {
      ACCEPTEE: { label: 'Paiement confirmé', ton: 'succes' },
      REALISEE: { label: 'Validation en attente', ton: 'alerte' },
      TERMINEE: { label: 'Terminée', ton: 'succes' },
    }[reponse.prestation_statut] || { label: 'Paiement confirmé', ton: 'succes' }
  }
  if (paiement === 'EN_ATTENTE' || paiement === 'INITIE') return { label: 'Paiement en attente', ton: 'attente' }
  if (paiement === 'A_REMBOURSER') return { label: 'Paiement en double', ton: 'alerte' }
  return { label: 'Devis accepté', ton: 'succes' }
}

function etapeDemande(demande) {
  const liste = reponsesParDemande.value.get(demande.id) || []
  if (demande.statut === 'ACCEPTE') {
    const acceptee = reponseAcceptee(demande)
    return acceptee ? etapeApresAcceptation(acceptee) : { label: 'Devis accepté', ton: 'succes' }
  }
  if (demande.statut === 'REFUSE') return { label: 'Refusé', ton: 'erreur' }
  if (demande.statut === 'EXPIRE') return { label: 'Expiré', ton: 'neutre' }
  if (liste.some((r) => r.statut === 'EN_ATTENTE')) return { label: 'Devis reçu', ton: 'alerte' }
  return { label: 'En attente de devis', ton: 'attente' }
}

function etapeReponse(reponse) {
  if (reponse.statut === 'ACCEPTEE') return etapeApresAcceptation(reponse)
  if (reponse.statut === 'REFUSEE') return { label: 'Refusé', ton: 'erreur' }
  if (reponse.est_expire) return { label: 'Expiré', ton: 'neutre' }
  return { label: 'À examiner', ton: 'alerte' }
}

function styleTon(etape) {
  const ton = TONS[etape.ton] || TONS.neutre
  return { backgroundColor: ton.bg, color: ton.color }
}

/* ─────────────── Chargement ─────────────── */

async function chargerDevis({ silencieux = false } = {}) {
  if (!silencieux) isLoading.value = true
  errorMessage.value = ''
  try {
    const [demandesData, reponsesData] = await Promise.all([
      devisService.listQuoteRequests(),
      devisService.listQuoteResponses(),
    ])
    demandes.value = Array.isArray(demandesData) ? demandesData : demandesData?.results || []
    reponses.value = Array.isArray(reponsesData) ? reponsesData : reponsesData?.results || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Nouveau devis reçu, ou changement de statut : rechargement silencieux.
useEvenementTempsReel(['devis.nouveau', 'devis.statut', 'demande.statut'], () => chargerDevis({ silencieux: true }))

onMounted(() => chargerDevis())

/* ─────────────── Accepter / refuser (avec confirmation) ─────────────── */

const decision = ref(null) // { reponse, action: 'accepter' | 'refuser' }
const decisionEnCours = ref(false)
const erreurDecision = ref('')

function ouvrirDecision(reponse, action) {
  erreurDecision.value = ''
  decision.value = { reponse, action }
}

function fermerDecision() {
  if (!decisionEnCours.value) decision.value = null
}

async function confirmerDecision() {
  if (!decision.value) return
  decisionEnCours.value = true
  erreurDecision.value = ''
  const { reponse, action } = decision.value
  try {
    if (action === 'accepter') {
      await devisService.acceptQuoteResponse(reponse.id)
      succes('Devis accepté. Vous pouvez maintenant payer la prestation.')
    } else {
      await devisService.refuseQuoteResponse(reponse.id)
      succes('Devis refusé.')
    }
    decision.value = null
    await chargerDevis({ silencieux: true })
  } catch (error) {
    erreurDecision.value = error?.message || 'Action impossible.'
  } finally {
    decisionEnCours.value = false
  }
}

/* ─────────────── Paiement (modal PayDunya existante) ─────────────── */

const reponseAPayer = ref(null)
const modalPaiementOuverte = ref(false)

// La modal attend une demande de prestation : c'est celle que le backend a
// créée à l'acceptation. Le montant n'est qu'affiché, jamais envoyé.
const demandeAPayer = computed(() =>
  reponseAPayer.value
    ? {
        id: reponseAPayer.value.demande_prestation,
        budget: reponseAPayer.value.prix_propose,
        service_nom: reponseAPayer.value.demande_service_nom,
      }
    : null,
)

function peutPayer(reponse) {
  return (
    reponse.statut === 'ACCEPTEE' &&
    reponse.demande_prestation &&
    reponse.prestation_statut === 'ACCEPTEE' &&
    !['REUSSI', 'A_REMBOURSER'].includes(reponse.paiement?.statut)
  )
}

function libellePaiement(reponse) {
  if (reponse.paiement?.statut === 'EN_ATTENTE') return 'Reprendre le paiement'
  if (reponse.paiement?.statut === 'ECHOUE') return `Réessayer · ${fcfa(reponse.prix_propose)}`
  return `Payer ${fcfa(reponse.prix_propose)}`
}

async function payer(reponse) {
  reponseAPayer.value = reponse
  // La modal est montée (v-if) par la ligne ci-dessus : on ne l'ouvre qu'au
  // tick suivant, pour que son watch(ouvert) voie le passage à « ouvert »
  // et préremplisse le numéro du compte (sinon le champ reste vide).
  await nextTick()
  modalPaiementOuverte.value = true
}

// Résultat sans redirection (fournisseur sandbox, ou paiement en préparation).
function onResultatPaiement() {
  chargerDevis({ silencieux: true })
}

/* ─────────────── Filtres ─────────────── */

const filtreActif = ref('toutes')

function compterParStatut(statut) {
  if (statut === 'toutes') return demandes.value.length
  return demandes.value.filter((demande) => demande.statut === statut).length
}

const filtres = [
  { id: 'toutes', label: 'Tous' },
  { id: 'EN_ATTENTE', label: 'En attente' },
  { id: 'ACCEPTE', label: 'Acceptés' },
  { id: 'REFUSE', label: 'Refusés' },
  { id: 'EXPIRE', label: 'Expirés' },
]

const demandesFiltrees = computed(() => {
  if (filtreActif.value === 'toutes') return demandes.value
  return demandes.value.filter((demande) => demande.statut === filtreActif.value)
})
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Mes devis</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Comparez les devis reçus, acceptez-en un puis payez en toute sécurité.</p>
      </div>

      <!-- Filtres -->
      <div class="-mx-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <button
          v-for="filtre in filtres"
          :key="filtre.id"
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-bold transition"
          :class="filtreActif === filtre.id ? 'bg-mimosy-text text-white' : 'border border-mimosy-border bg-mimosy-surface text-mimosy-text hover:border-mimosy-primary hover:text-mimosy-primary'"
          @click="filtreActif = filtre.id"
        >
          {{ filtre.label }}
          <span class="rounded-full px-1.5 py-0.5 text-[11px] leading-none" :class="filtreActif === filtre.id ? 'bg-white/15 text-white' : 'bg-mimosy-page text-mimosy-secondary'">
            {{ compterParStatut(filtre.id) }}
          </span>
        </button>
      </div>

      <p v-if="isLoading" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-8 text-center font-sans text-sm font-semibold text-mimosy-secondary">
        Chargement de vos devis...
      </p>

      <p v-else-if="errorMessage" class="rounded-[24px] border border-[#FECACA] bg-[#FFF0EE] p-6 text-center font-sans text-sm font-semibold text-[#C53B35]">
        {{ errorMessage }}
      </p>

      <EmptyState v-else-if="!demandesFiltrees.length" title="Aucune demande de devis" message="Vos demandes de devis apparaîtront ici après envoi à un prestataire." />

      <div v-else class="grid gap-5">
        <article v-for="demande in demandesFiltrees" :key="demande.id" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 sm:p-6 lg:p-8">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-mimosy-border pb-5">
            <div class="flex min-w-0 items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary">
                <FileText class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <h2 class="font-serif text-lg text-mimosy-text sm:text-xl">{{ demande.service_nom || 'Service non renseigné' }}</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Prestataire : {{ demande.prestataire_nom || 'Non renseigné' }}</p>
              </div>
            </div>

            <span class="rounded-full px-3 py-1 font-sans text-xs font-bold" :style="styleTon(etapeDemande(demande))">
              {{ etapeDemande(demande).label }}
            </span>
          </div>

          <dl class="mt-5 grid gap-4 font-sans text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Budget estimé</dt>
              <dd class="mt-1 font-bold text-mimosy-text">{{ fcfa(demande.budget_estime) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Date souhaitée</dt>
              <dd class="mt-1 font-bold text-mimosy-text">{{ formatDate(demande.date_souhaitee) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Demandé le</dt>
              <dd class="mt-1 font-bold text-mimosy-text">{{ formatDate(demande.date_creation) }}</dd>
            </div>
          </dl>

          <p v-if="demande.description" class="mt-5 font-sans text-sm leading-6 text-mimosy-secondary">{{ demande.description }}</p>

          <!-- DEVIS REÇUS -->
          <div class="mt-6 border-t border-mimosy-border pt-6">
            <div class="flex items-center gap-2">
              <MessageSquare class="h-4 w-4 text-mimosy-primary" />
              <h3 class="font-sans font-bold text-mimosy-text">Devis reçu{{ (reponsesParDemande.get(demande.id)?.length || 0) > 1 ? 's' : '' }}</h3>
            </div>

            <div v-if="reponsesParDemande.get(demande.id)?.length" class="mt-4 grid gap-5">
              <div v-for="reponse in reponsesParDemande.get(demande.id)" :key="reponse.id" class="grid gap-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="rounded-full px-3 py-1 font-sans text-xs font-bold" :style="styleTon(etapeReponse(reponse))">
                    {{ etapeReponse(reponse).label }}
                  </span>
                </div>

                <DevisDetail :reponse="reponse" :service="demande.service_nom" />

                <!-- Décision : uniquement sur un devis encore ouvert et valide -->
                <div
                  v-if="demande.statut === 'EN_ATTENTE' && reponse.statut === 'EN_ATTENTE' && !reponse.est_expire"
                  class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end"
                >
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-3 font-sans text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE]"
                    @click="ouvrirDecision(reponse, 'refuser')"
                  >
                    <XCircle class="h-4 w-4" />
                    Refuser le devis
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-mimosy-primary px-5 py-3 font-sans text-sm font-bold text-white transition hover:opacity-90"
                    @click="ouvrirDecision(reponse, 'accepter')"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                    Accepter le devis
                  </button>
                </div>
                <p v-else-if="reponse.statut === 'EN_ATTENTE' && reponse.est_expire" class="rounded-xl bg-mimosy-page px-4 py-3 font-sans text-sm text-mimosy-secondary">
                  Ce devis a expiré : il ne peut plus être accepté. Demandez un nouveau devis au prestataire.
                </p>

                <!-- Après acceptation : paiement, puis suivi -->
                <div v-if="reponse.statut === 'ACCEPTEE'" class="rounded-2xl border border-mimosy-border bg-mimosy-page p-4 sm:p-5">
                  <template v-if="reponse.paiement?.statut === 'REUSSI'">
                    <p class="font-sans text-sm font-bold text-mimosy-primary">Paiement confirmé · {{ fcfa(reponse.paiement.montant) }}</p>
                    <p class="mt-1 font-sans text-sm text-mimosy-secondary">
                      <template v-if="reponse.prestation_statut === 'TERMINEE'">Prestation terminée. Les fonds ont été versés au prestataire.</template>
                      <template v-else-if="reponse.prestation_statut === 'REALISEE'">Le prestataire indique avoir terminé : vérifiez le travail puis confirmez-le depuis la demande.</template>
                      <template v-else>Les fonds sont sécurisés par MIMOSY jusqu'à la validation de la prestation.</template>
                    </p>
                  </template>
                  <template v-else-if="reponse.paiement?.statut === 'EN_ATTENTE' || reponse.paiement?.statut === 'INITIE'">
                    <p class="font-sans text-sm font-bold text-[#3267B1]">Paiement en attente de confirmation par PayDunya</p>
                    <p class="mt-1 font-sans text-sm text-mimosy-secondary">Si vous avez quitté la page de paiement, vous pouvez la reprendre.</p>
                  </template>
                  <template v-else-if="reponse.paiement?.statut === 'A_REMBOURSER'">
                    <p class="font-sans text-sm font-bold text-[#9A723C]">Un paiement en double a été détecté : il vous sera remboursé par MIMOSY.</p>
                  </template>
                  <template v-else>
                    <p class="font-sans text-xs font-bold uppercase tracking-[0.12em] text-mimosy-secondary">Devis accepté · Total à payer</p>
                    <p class="mt-1 font-serif text-[28px] leading-9 text-mimosy-text">{{ fcfa(reponse.prix_propose) }}</p>
                    <p v-if="reponse.paiement?.statut === 'ECHOUE'" class="mt-1 font-sans text-sm font-semibold text-[#A85148]">Le paiement précédent n'a pas abouti.</p>
                  </template>

                  <div class="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                    <button
                      v-if="peutPayer(reponse)"
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-xl bg-mimosy-primary px-5 py-3 font-sans text-sm font-bold text-white transition hover:opacity-90"
                      @click="payer(reponse)"
                    >
                      {{ libellePaiement(reponse) }}
                    </button>
                    <router-link
                      v-if="reponse.paiement?.statut === 'REUSSI'"
                      :to="{ name: 'client-facture', params: { id: reponse.paiement.id } }"
                      class="inline-flex items-center justify-center gap-2 rounded-xl bg-mimosy-primary px-5 py-3 font-sans text-sm font-bold text-white transition hover:opacity-90"
                    >
                      <Receipt class="h-4 w-4" />
                      Voir la facture
                    </router-link>
                    <router-link
                      v-if="reponse.demande_prestation"
                      :to="{ name: 'detais.demande', params: { id: reponse.demande_prestation } }"
                      class="inline-flex items-center justify-center rounded-xl border border-mimosy-border bg-mimosy-surface px-5 py-3 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary"
                    >
                      Suivre la prestation
                    </router-link>
                  </div>
                </div>
              </div>
            </div>

            <p v-else class="mt-3 rounded-xl border border-dashed border-mimosy-border p-4 font-sans text-sm text-mimosy-secondary">
              Aucun devis reçu pour le moment.
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- Confirmation d'acceptation / de refus -->
    <Modal
      :model-value="Boolean(decision)"
      :title="decision?.action === 'accepter' ? 'Accepter ce devis ?' : 'Refuser ce devis ?'"
      @update:model-value="fermerDecision"
    >
      <template v-if="decision">
        <div v-if="decision.action === 'accepter'" class="rounded-[20px] bg-mimosy-primaryBg p-5">
          <p class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-primary">Total à payer après acceptation</p>
          <p class="mt-1 font-serif text-[32px] leading-10 text-mimosy-text">{{ fcfa(decision.reponse.prix_propose) }}</p>
          <p class="mt-2 font-sans text-sm text-mimosy-secondary">
            Vous paierez ensuite ce montant via PayDunya. L'argent reste sécurisé par MIMOSY jusqu'à ce que vous confirmiez la fin de la prestation.
          </p>
        </div>
        <p v-else class="font-sans text-sm leading-6 text-mimosy-secondary">
          Le prestataire sera prévenu. Un devis refusé ne peut plus être accepté ni payé.
        </p>

        <p v-if="erreurDecision" class="mt-4 rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm font-semibold text-[#A85148]" role="alert">{{ erreurDecision }}</p>

        <div class="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-xl border border-mimosy-border px-5 py-3 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page disabled:opacity-50"
            :disabled="decisionEnCours"
            @click="fermerDecision"
          >
            Retour
          </button>
          <button
            type="button"
            class="rounded-xl px-5 py-3 font-sans text-sm font-bold text-white transition disabled:opacity-60"
            :class="decision.action === 'accepter' ? 'bg-mimosy-primary hover:opacity-90' : 'bg-[#A85148] hover:bg-[#8F4038]'"
            :disabled="decisionEnCours"
            @click="confirmerDecision"
          >
            {{ decisionEnCours ? 'Patientez…' : decision.action === 'accepter' ? 'Accepter le devis' : 'Refuser le devis' }}
          </button>
        </div>
      </template>
    </Modal>

    <PaiementModal
      v-if="demandeAPayer"
      v-model="modalPaiementOuverte"
      :demande="demandeAPayer"
      :paiement-en-cours="reponseAPayer?.paiement?.statut === 'EN_ATTENTE' ? reponseAPayer.paiement : null"
      :prestataire-nom="reponseAPayer?.prestataire_nom || ''"
      @resultat="onResultatPaiement"
    />
  </ClientLayout>
</template>
