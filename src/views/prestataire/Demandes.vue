<script setup>
import { computed, onMounted, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useDemandePrestationStore } from '@/stores/demandePrestation'

const authStore = useAuthStore()
const demandeStore = useDemandePrestationStore()
const selectedId = ref('')

const userName = computed(() => [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ') || 'Prestataire')
const demandes = computed(() => demandeStore.demandes)
const demandeSelectionnee = computed(() => demandes.value.find((demande) => demande.id === selectedId.value) || demandes.value[0] || null)

const statusLabels = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR')
}

function selectDemande(id) {
  selectedId.value = id
}

async function changerStatut(action, id) {
  await action(id)
  selectedId.value = id
}

onMounted(async () => {
  await demandeStore.chargerDemandes(true).catch(() => {})
  selectedId.value = demandes.value[0]?.id || ''
})
</script>

<template>
  <AppLayout role="prestataire">
    <div class="mx-auto flex w-full  flex-col gap-7">
      <ClientHeader title="Demandes reçues" subtitle="Traitez uniquement les demandes qui vous sont destinées." :user-name="userName" profile-path="/prestataire/profil" />

      <p v-if="demandeStore.isLoading" class="rounded-2xl bg-white p-8 text-center text-[#64748B]">Chargement des demandes...</p>
      <p v-else-if="demandeStore.errorMessage" class="rounded-2xl bg-[#FFF0EE] p-6 text-center text-[#A85148]">{{ demandeStore.errorMessage }}</p>

      <EmptyState
        v-else-if="!demandes.length"
        title="Aucune demande reçue"
        message="Les demandes envoyées à vos services apparaîtront ici."
      />

      <section v-else class="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div class="flex flex-col gap-3">
          <button
            v-for="demande in demandes"
            :key="demande.id"
            type="button"
            class="w-full rounded-2xl border bg-white p-5 text-left transition"
            :class="demandeSelectionnee?.id === demande.id ? 'border-[#2F6250] ring-2 ring-[#2F6250]/10' : 'border-[#E2E8F0] hover:border-[#B7C8BF]'"
            @click="selectDemande(demande.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate font-bold text-[#051F20]">{{ demande.service_nom || 'Service non renseigné' }}</h2>
                <p class="mt-1 text-sm text-[#64748B]">Client : {{ demande.client_nom || 'Client' }}</p>
              </div>
              <span class="shrink-0 rounded-full px-3 py-1 text-xs font-bold" :class="demande.statut === 'EN_ATTENTE' ? 'bg-[#FFF7E6] text-[#9A723C]' : demande.statut === 'ACCEPTEE' ? 'bg-[#EAF8F2] text-[#16805B]' : demande.statut === 'REFUSEE' ? 'bg-[#FFF0EE] text-[#A85148]' : 'bg-[#EDF4FF] text-[#3267B1]'">
                {{ statusLabels[demande.statut] || demande.statut }}
              </span>
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>{{ formatDate(demande.date_souhaitee) }}</span>
              <strong class="text-[#2F6250]">{{ Number(demande.budget || 0).toLocaleString('fr-FR') }} FCFA</strong>
            </div>
          </button>
        </div>

        <article v-if="demandeSelectionnee" class="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-[#64748B]">Détail de la demande</p>
              <h2 class="mt-2 text-2xl font-extrabold text-[#051F20]">{{ demandeSelectionnee.service_nom || 'Service non renseigné' }}</h2>
              <p class="mt-1 text-sm text-[#64748B]">Client : {{ demandeSelectionnee.client_nom || 'Client' }}</p>
            </div>
            <span class="rounded-full bg-[#EDF4FF] px-3 py-1 text-xs font-bold text-[#3267B1]">{{ statusLabels[demandeSelectionnee.statut] || demandeSelectionnee.statut }}</span>
          </div>

          <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-[#94A3B8]">Date souhaitée</dt>
              <dd class="font-bold text-[#334155]">{{ formatDate(demandeSelectionnee.date_souhaitee) }}</dd>
            </div>
            <div>
              <dt class="text-[#94A3B8]">Budget</dt>
              <dd class="font-bold text-[#2F6250]">{{ Number(demandeSelectionnee.budget || 0).toLocaleString('fr-FR') }} FCFA</dd>
            </div>
            <div>
              <dt class="text-[#94A3B8]">Créée le</dt>
              <dd class="font-bold text-[#334155]">{{ formatDate(demandeSelectionnee.date_creation) }}</dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-[#F1F5F9] pt-5">
            <p class="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Description</p>
            <p class="mt-2 text-sm leading-6 text-[#64748B]">{{ demandeSelectionnee.description }}</p>
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            <button v-if="demandeSelectionnee.statut === 'EN_ATTENTE'" type="button" class="rounded-xl bg-[#2F6250] px-4 py-3 text-sm font-bold text-white disabled:opacity-50" :disabled="demandeStore.isLoading" @click="changerStatut(demandeStore.accepterDemande, demandeSelectionnee.id)">Accepter</button>
            <button v-if="demandeSelectionnee.statut === 'EN_ATTENTE'" type="button" class="rounded-xl border border-[#E7B8B2] px-4 py-3 text-sm font-bold text-[#A85148] disabled:opacity-50" :disabled="demandeStore.isLoading" @click="changerStatut(demandeStore.refuserDemande, demandeSelectionnee.id)">Refuser</button>
            <button v-if="demandeSelectionnee.statut === 'ACCEPTEE'" type="button" class="rounded-xl border border-[#2F6250] px-4 py-3 text-sm font-bold text-[#2F6250] disabled:opacity-50" :disabled="demandeStore.isLoading" @click="changerStatut(demandeStore.terminerDemande, demandeSelectionnee.id)">Marquer terminée</button>
          </div>
        </article>
      </section>
    </div>
  </AppLayout>
</template>
