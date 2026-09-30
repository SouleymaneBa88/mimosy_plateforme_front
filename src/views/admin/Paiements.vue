<script setup>
/**
 * Mode paiement : regroupe Paiements, Retraits et Transactions sous un
 * seul menu (trois onglets d'une même page), au lieu de trois entrées
 * séparées dans la sidebar. Chaque onglet garde son propre filtre et
 * son propre état de chargement, mais ne recharge ses données qu'à la
 * première visite.
 */
// Outils Vue.
import { reactive, ref } from 'vue'

// Les composants de la page et les appels à l'API admin.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import * as adminService from '@/services/adminService'

// Les trois onglets de la page, et l'onglet ouvert.
const onglets = [
  { id: 'paiements', label: 'Paiements' },
  { id: 'retraits', label: 'Retraits' },
  { id: 'transactions', label: 'Transactions' },
]
const ongletActif = ref('paiements')

// L'état de chaque onglet : ses éléments, chargement, erreur, "déjà chargé ?", et filtre.
const paiements = reactive({ items: [], loading: false, error: '', charge: false, statut: '' })
const retraits = reactive({ items: [], loading: false, error: '', charge: false, statut: '' })
const transactions = reactive({ items: [], loading: false, error: '', charge: false })

// A_REMBOURSER : payé en double chez PayDunya, à rembourser à la main.
const statutsPaiement = ['', 'INITIE', 'EN_ATTENTE', 'REUSSI', 'ECHOUE', 'ANNULE', 'REMBOURSE', 'A_REMBOURSER']
// SIMULE : retrait de démonstration (PAYDUNYA_PAYOUT_DEMO), aucun déboursement PayDunya.
const statutsRetrait = ['', 'EN_ATTENTE', 'EN_COURS', 'REUSSI', 'ECHOUE', 'ANNULE', 'SIMULE']
// Libellés lisibles des types de transaction.
const typeLabels = {
  BLOCAGE: 'Fonds bloqués',
  COMMISSION: 'Commission MIMOSY',
  LIBERATION: 'Fonds libérés',
  RETRAIT: 'Retrait',
  REMBOURSEMENT: 'Remboursement',
}

// Couleurs du badge selon le statut (gris par défaut).
const statutClasses = {
  REUSSI: 'bg-[#EAF8F2] text-[#16805B]',
  ECHOUE: 'bg-[#FFF0EE] text-[#A85148]',
  A_REMBOURSER: 'bg-[#FFFBF0] text-[#9A723C]',
  SIMULE: 'bg-[#FFF4DB] text-[#8A5A00]',
}
const classeStatut = (statut) => statutClasses[statut] || 'bg-[#F1F5F9] text-[#64748B]'

// Charge la liste des paiements (avec le filtre statut).
async function chargerPaiements() {
  paiements.loading = true
  paiements.error = ''
  try {
    paiements.items = await adminService.listPaiements(paiements.statut || undefined)
    paiements.charge = true
  } catch (error) {
    paiements.error = error.message
  } finally {
    paiements.loading = false
  }
}

// Charge la liste des retraits (avec le filtre statut).
async function chargerRetraits() {
  retraits.loading = true
  retraits.error = ''
  try {
    retraits.items = await adminService.listRetraits(retraits.statut || undefined)
    retraits.charge = true
  } catch (error) {
    retraits.error = error.message
  } finally {
    retraits.loading = false
  }
}

// Charge le journal des transactions.
async function chargerTransactions() {
  transactions.loading = true
  transactions.error = ''
  try {
    transactions.items = await adminService.listTransactions()
    transactions.charge = true
  } catch (error) {
    transactions.error = error.message
  } finally {
    transactions.loading = false
  }
}

// Ouvre un onglet et le charge s'il ne l'a jamais été.
function ouvrirOnglet(id) {
  ongletActif.value = id
  if (id === 'paiements' && !paiements.charge) chargerPaiements()
  if (id === 'retraits' && !retraits.charge) chargerRetraits()
  if (id === 'transactions' && !transactions.charge) chargerTransactions()
}

// Au démarrage, on charge l'onglet "Paiements".
chargerPaiements()
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full flex-col gap-6">
      <ClientHeader title="Paiements" subtitle="Paiements, retraits et transactions financières MIMOSY." />

      <!-- Barre des onglets. -->
      <div class="flex gap-1 border-b border-[#E2E8F0]">
        <button
          v-for="onglet in onglets"
          :key="onglet.id"
          type="button"
          class="rounded-t-lg px-4 py-2.5 text-sm font-bold transition"
          :class="ongletActif === onglet.id ? 'border-b-2 border-[#2F6250] text-[#2F6250]' : 'text-[#64748B] hover:text-[#051F20]'"
          @click="ouvrirOnglet(onglet.id)"
        >
          {{ onglet.label }}
        </button>
      </div>

      <!-- Paiements -->
      <template v-if="ongletActif === 'paiements'">
        <select v-model="paiements.statut" class="w-fit rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black" @change="chargerPaiements">
          <option v-for="statut in statutsPaiement" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
        </select>

        <Loader v-if="paiements.loading" />
        <ErrorState v-else-if="paiements.error" :message="paiements.error" @retry="chargerPaiements" />
        <EmptyState v-else-if="!paiements.items.length" title="Aucun paiement" message="Aucun paiement ne correspond à ce filtre." />

        <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
              <tr>
                <th class="px-4 py-3">Service</th>
                <th class="px-4 py-3">Montant</th>
                <th class="px-4 py-3">Fournisseur</th>
                <th class="px-4 py-3">Statut</th>
                <th class="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr v-for="paiement in paiements.items" :key="paiement.id">
                <td class="px-4 py-3 text-[#051F20]">{{ paiement.service_nom || '—' }}</td>
                <td class="px-4 py-3 font-bold text-[#051F20]">{{ Number(paiement.montant).toLocaleString('fr-FR') }} FCFA</td>
                <td class="px-4 py-3 text-[#051F20]">{{ paiement.provider }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="classeStatut(paiement.statut)">{{ paiement.statut }}</span>
                </td>
                <td class="px-4 py-3 text-[#64748B]">{{ new Date(paiement.date_creation).toLocaleDateString('fr-FR') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Retraits -->
      <template v-else-if="ongletActif === 'retraits'">
        <select v-model="retraits.statut" class="w-fit rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black" @change="chargerRetraits">
          <option v-for="statut in statutsRetrait" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
        </select>

        <Loader v-if="retraits.loading" />
        <ErrorState v-else-if="retraits.error" :message="retraits.error" @retry="chargerRetraits" />
        <EmptyState v-else-if="!retraits.items.length" title="Aucun retrait" message="Aucun retrait ne correspond à ce filtre." />

        <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
              <tr>
                <th class="px-4 py-3">Montant</th>
                <th class="px-4 py-3">Destination</th>
                <th class="px-4 py-3">Fournisseur</th>
                <th class="px-4 py-3">Statut</th>
                <th class="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr v-for="retrait in retraits.items" :key="retrait.id">
                <td class="px-4 py-3 font-bold text-[#051F20]">{{ Number(retrait.montant).toLocaleString('fr-FR') }} FCFA</td>
                <td class="px-4 py-3">{{ retrait.destination }}</td>
                <td class="px-4 py-3">{{ retrait.provider }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="classeStatut(retrait.statut)">{{ retrait.statut }}</span>
                </td>
                <td class="px-4 py-3 text-[#64748B]">{{ new Date(retrait.date_creation).toLocaleDateString('fr-FR') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Transactions -->
      <template v-else>
        <Loader v-if="transactions.loading" />
        <ErrorState v-else-if="transactions.error" :message="transactions.error" @retry="chargerTransactions" />
        <EmptyState v-else-if="!transactions.items.length" title="Aucune transaction" message="Le journal financier est vide pour le moment." />

        <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
              <tr>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Description</th>
                <th class="px-4 py-3">Montant</th>
                <th class="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr v-for="tx in transactions.items" :key="tx.id">
                <td class="px-4 py-3 font-bold text-[#051F20]">{{ typeLabels[tx.type] || tx.type }}</td>
                <td class="px-4 py-3 text-[#64748B]">{{ tx.description }}</td>
                <td class="px-4 py-3 font-bold">{{ Number(tx.montant).toLocaleString('fr-FR') }} FCFA</td>
                <td class="px-4 py-3 text-[#64748B]">{{ new Date(tx.date_creation).toLocaleString('fr-FR') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
