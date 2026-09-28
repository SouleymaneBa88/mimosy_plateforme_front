<script setup>
import { onMounted } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useAdminListe } from '@/composables/useAdminListe'
import * as adminService from '@/services/adminService'

const { items: devis, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage } =
  useAdminListe(adminService.listDevisAdmin, { statut: '' })

const statuts = ['', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'EXPIRE']

const classeStatut = {
  ACCEPTE: 'bg-[#EAF8F2] text-[#16805B]',
  REFUSE: 'bg-[#FFF0EE] text-[#A85148]',
  EXPIRE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_ATTENTE: 'bg-[#FFF7E6] text-[#9A723C]',
}

onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Devis" subtitle="Historique complet des demandes de devis." />

      <select v-model="filtres.statut" class="w-fit rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black" @change="rechercher">
        <option v-for="statut in statuts" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
      </select>

      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />
      <EmptyState v-else-if="!devis.length" title="Aucun devis trouvé" message="Aucune demande de devis ne correspond à ce filtre." />

      <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table class="w-full text-sm">
          <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
            <tr>
              <th class="px-4 py-3">Client</th>
              <th class="px-4 py-3">Prestataire</th>
              <th class="px-4 py-3">Service</th>
              <th class="px-4 py-3">Budget estimé</th>
              <th class="px-4 py-3">Réponses</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9]">
            <tr v-for="devisItem in devis" :key="devisItem.id">
              <td class="px-4 py-3 font-bold text-[#051F20]">{{ devisItem.client_nom }}</td>
              <td class="px-4 py-3 text-[#334155]">{{ devisItem.prestataire_nom || '—' }}</td>
              <td class="px-4 py-3 text-[#334155]">{{ devisItem.service_nom || '—' }}</td>
              <td class="px-4 py-3 font-bold text-[#051F20]">{{ Number(devisItem.budget_estime).toLocaleString('fr-FR') }} FCFA</td>
              <td class="px-4 py-3 text-[#334155]">{{ devisItem.nombre_reponses }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="classeStatut[devisItem.statut]">{{ devisItem.statut }}</span>
              </td>
              <td class="px-4 py-3 text-[#64748B]">{{ new Date(devisItem.date_creation).toLocaleDateString('fr-FR') }}</td>
            </tr>
          </tbody>
        </table>

        <Pagination :page="page" :count="count" :page-size="pageSize" @update:page="changerPage" />
      </div>
    </div>
  </AppLayout>
</template>
