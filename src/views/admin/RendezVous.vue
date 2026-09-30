<!--
  Page admin "Rendez-vous" : tous les rendez-vous de la plateforme,
  avec filtres (statut, période) et détection des conflits d'agenda.
-->
<script setup>
// onMounted : exécuter du code quand la page s'affiche.
import { onMounted } from 'vue'

// Les composants utilisés sur la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Pagination from '@/components/common/Pagination.vue'
// Le composable des listes admin et les appels à l'API admin.
import { useAdminListe } from '@/composables/useAdminListe'
import * as adminService from '@/services/adminService'

// Liste paginée des rendez-vous, avec filtres statut + dates.
const { items: rendezVous, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage } =
  useAdminListe(adminService.listRendezVousAdmin, { statut: '', date_debut: '', date_fin: '' })

// Les statuts proposés dans le filtre.
const statuts = ['', 'EN_ATTENTE', 'CONFIRME', 'REFUSE', 'ANNULE', 'TERMINE']

// Couleurs du badge selon le statut.
const classeStatut = {
  CONFIRME: 'bg-[#EAF8F2] text-[#16805B]',
  TERMINE: 'bg-[#EAF8F2] text-[#16805B]',
  REFUSE: 'bg-[#FFF0EE] text-[#A85148]',
  ANNULE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_ATTENTE: 'bg-[#FFF7E6] text-[#9A723C]',
}

// On charge la liste dès que la page s'affiche.
onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Rendez-vous" subtitle="Agenda complet des rendez-vous, avec détection des conflits." />

      <!-- Filtres : statut, date de début, date de fin. -->
      <div class="flex flex-wrap items-center gap-2 text-black">
        <select v-model="filtres.statut" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="rechercher">
          <option v-for="statut in statuts" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
        </select>
        <input v-model="filtres.date_debut" type="date" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="rechercher" />
        <input v-model="filtres.date_fin" type="date" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="rechercher" />
      </div>

      <!-- États : chargement, erreur, vide. -->
      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />
      <EmptyState v-else-if="!rendezVous.length" title="Aucun rendez-vous trouvé" message="Aucun rendez-vous ne correspond à ces critères." />

      <!-- Tableau des rendez-vous ; la colonne "Conflit" signale un chevauchement. -->
      <div v-else class="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table class="w-full text-sm">
          <thead class="bg-[#F8FAFC] text-left text-xs uppercase text-[#94A3B8]">
            <tr>
              <th class="px-4 py-3">Client</th>
              <th class="px-4 py-3">Prestataire</th>
              <th class="px-4 py-3">Service</th>
              <th class="px-4 py-3">Début</th>
              <th class="px-4 py-3">Fin</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3">Conflit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9]">
            <tr v-for="rdv in rendezVous" :key="rdv.id">
              <td class="px-4 py-3 font-bold text-[#051F20]">{{ rdv.client_nom }}</td>
              <td class="px-4 py-3 text-[#334155]">{{ rdv.prestataire_nom }}</td>
              <td class="px-4 py-3 text-[#334155]">{{ rdv.service_nom }}</td>
              <td class="px-4 py-3 text-[#64748B]">{{ new Date(rdv.date_heure_debut).toLocaleString('fr-FR') }}</td>
              <td class="px-4 py-3 text-[#64748B]">{{ new Date(rdv.date_heure_fin).toLocaleString('fr-FR') }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="classeStatut[rdv.statut]">{{ rdv.statut }}</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="rdv.conflit" class="rounded-full bg-[#FFF0EE] px-2.5 py-1 text-xs font-bold text-[#A85148]">Conflit détecté</span>
                <span v-else class="text-xs text-[#94A3B8]">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <Pagination :page="page" :count="count" :page-size="pageSize" @update:page="changerPage" />
      </div>
    </div>
  </AppLayout>
</template>
