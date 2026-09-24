<script setup>
/**
 * Page de retour après un paiement PayDunya.
 *
 * PayDunya redirige le client ici via `return_url` (voir
 * apps.wallet.providers.paydunya.PayDunyaPaymentProvider) une fois
 * qu'il a terminé (ou abandonné) le paiement sur sa propre page. Ce
 * retour de redirection n'est PAS une preuve de paiement — un client
 * peut très bien atterrir ici sans avoir payé (fermeture d'onglet,
 * retour navigateur). La seule source de vérité est donc l'appel à
 * GET /api/wallet/mes-paiements/<id>/statut/, qui déclenche côté
 * backend une vérification active auprès de PayDunya (voir
 * apps.wallet.services.verifier_statut_paiement) : jamais un texte
 * "paiement réussi" affiché sur la seule foi du retour de redirection.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Clock3, TriangleAlert, XCircle } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import * as walletService from '@/services/walletService'

const route = useRoute()
const router = useRouter()

const paiement = ref(null)
const erreur = ref('')
let intervalle = null

const paiementId = computed(() => route.query.payment_id)

async function verifier() {
  if (!paiementId.value) {
    erreur.value = 'Paiement introuvable.'
    return
  }
  try {
    paiement.value = await walletService.getStatutPaiement(paiementId.value)
    // Tant que PayDunya n'a pas encore notifié MIMOSY (callback pas
    // encore reçu, confirmation encore "pending" chez PayDunya), on
    // continue de vérifier périodiquement plutôt que de laisser le
    // client sur un état figé — sans jamais dépasser un délai raisonnable.
    if (paiement.value?.statut !== 'EN_ATTENTE' && intervalle) {
      clearInterval(intervalle)
      intervalle = null
    }
  } catch (error) {
    erreur.value = error.message
  }
}

onMounted(() => {
  verifier()
  intervalle = setInterval(verifier, 4000)
  // Filet de sécurité : n'interroge jamais indéfiniment un paiement
  // resté "pending" (ex. le client a abandonné sur la page PayDunya).
  setTimeout(() => {
    if (intervalle) {
      clearInterval(intervalle)
      intervalle = null
    }
  }, 60000)
})

onUnmounted(() => {
  if (intervalle) clearInterval(intervalle)
})

function voirLaDemande() {
  if (paiement.value?.demande_prestation) {
    router.push(`/client/demandes/${paiement.value.demande_prestation}`)
  } else {
    router.push('/client/demandes')
  }
}
</script>

<template>
  <ClientLayout>
    <!-- Conteneur "standard" réduit : page de confirmation centrée, pas une liste. -->
    <div class="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-16 text-center sm:px-8">
      <div v-if="erreur" class="w-full rounded-[24px] border border-[#E7B8B2] bg-[#FFF0EE] p-8 sm:p-10">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#A85148]">
          <TriangleAlert class="h-6 w-6" />
        </div>
        <p class="mt-4 font-sans text-sm font-bold text-[#A85148]">{{ erreur }}</p>
        <button type="button" class="mt-5 rounded-xl bg-mimosy-primary px-5 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="router.push('/client/demandes')">
          Retour à mes demandes
        </button>
      </div>

      <div v-else-if="!paiement" class="w-full rounded-[24px] border border-mimosy-border bg-mimosy-surface p-10">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-mimosy-border border-t-mimosy-primary" />
        <p class="mt-4 font-sans text-sm font-bold text-mimosy-secondary">Vérification du paiement…</p>
      </div>

      <div v-else-if="paiement.statut === 'EN_ATTENTE'" class="w-full rounded-[24px] border border-[#BFD7EE] bg-[#EDF4FF] p-10">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#3267B1]">
          <Clock3 class="h-6 w-6" />
        </div>
        <h1 class="mt-5 font-serif text-lg text-mimosy-text">Paiement en cours</h1>
        <p class="mt-2 font-sans text-sm text-[#3267B1]">
          PayDunya n'a pas encore confirmé votre paiement. Cette page se met à jour automatiquement — vous
          pouvez aussi revenir plus tard, la demande sera confirmée dès la confirmation reçue.
        </p>
        <button type="button" class="mt-6 rounded-xl border border-[#3267B1] bg-white px-5 py-2.5 font-sans text-sm font-bold text-[#3267B1] transition hover:bg-[#EDF4FF]" @click="voirLaDemande">
          Voir la demande
        </button>
      </div>

      <div v-else-if="paiement.statut === 'REUSSI'" class="w-full rounded-[24px] border border-mimosy-primary/30 bg-mimosy-primaryBg p-10">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mimosy-primary text-white">
          <CheckCircle2 class="h-7 w-7" />
        </div>
        <h1 class="mt-5 font-serif text-lg text-mimosy-text">Paiement réussi</h1>
        <p class="mt-2 font-sans text-sm text-mimosy-secondary">
          Votre demande est confirmée. Les fonds sont bloqués et seront reversés au prestataire une fois la
          prestation terminée.
        </p>
        <button type="button" class="mt-6 rounded-xl bg-mimosy-primary px-5 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="voirLaDemande">
          Voir ma demande
        </button>
      </div>

      <div v-else class="w-full rounded-[24px] border border-[#E7B8B2] bg-[#FFF0EE] p-10">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#A85148]">
          <XCircle class="h-6 w-6" />
        </div>
        <h1 class="mt-5 font-serif text-lg text-mimosy-text">Paiement échoué</h1>
        <p class="mt-2 font-sans text-sm text-[#A85148]">
          Le paiement n'a pas abouti. Votre demande n'est pas confirmée mais reste enregistrée : vous pouvez
          réessayer depuis la page de la demande.
        </p>
        <button type="button" class="mt-6 rounded-xl bg-mimosy-primary px-5 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90" @click="voirLaDemande">
          Réessayer
        </button>
      </div>
    </div>
  </ClientLayout>
</template>
