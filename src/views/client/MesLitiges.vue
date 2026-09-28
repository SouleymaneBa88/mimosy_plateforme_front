<script setup>
/**
 * Filtres dans le même esprit visuel que MesDemandes.vue / MesDevis.vue,
 * regroupant les vrais statuts de litige MIMOSY (voir LitigeCard.vue) —
 * aucun statut inventé. Le bouton "Confirmer la reprise" reste dans
 * LitigeCard.vue, où il n'apparaît déjà que pour le rôle PRESTATAIRE
 * (seul rôle pour lequel cette action existe réellement côté API) : ne
 * pas en ajouter un ici pour le CLIENT, qui n'a pas cette action.
 */
import { computed, onMounted, ref } from 'vue'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import LitigeCard from '@/components/disputes/LitigeCard.vue'
import * as disputeService from '@/services/disputeService'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'

const litiges = ref([])
const loading = ref(false)
const errorMessage = ref('')

async function charger() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await disputeService.listMesLitiges()
    litiges.value = Array.isArray(data) ? data : data?.results || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(charger)
useEvenementTempsReel(['litige.nouveau', 'litige.statut', 'litige.preuve'], () => charger())

/* ---------------------------------------------------------------- *
 * Filtres : regroupement des vrais statuts (voir LitigeCard.vue) sous
 * 4 catégories lisibles, sans en inventer aucun.
 * ---------------------------------------------------------------- */
const GROUPES = {
  en_attente: ['EN_ATTENTE'],
  en_cours: ['EN_COURS', 'REPRISE_DEMANDEE', 'REPRISE_EFFECTUEE', 'DELAI_EXPIRE', 'REATTRIBUE'],
  resolu: ['RESOLU'],
  rejete: ['REJETE'],
}

function groupeDe(statut) {
  return Object.keys(GROUPES).find((groupe) => GROUPES[groupe].includes(statut)) || 'en_attente'
}

const filtreActif = ref('toutes')

function compterParGroupe(id) {
  if (id === 'toutes') return litiges.value.length
  return litiges.value.filter((litige) => groupeDe(litige.statut) === id).length
}

const filtres = computed(() => [
  { id: 'toutes', label: 'Tous' },
  { id: 'en_attente', label: 'En attente' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'resolu', label: 'Résolus' },
  { id: 'rejete', label: 'Rejetés' },
])

const litigesFiltres = computed(() => {
  if (filtreActif.value === 'toutes') return litiges.value
  return litiges.value.filter((litige) => groupeDe(litige.statut) === filtreActif.value)
})
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[100%] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Mes litiges</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Suivez vos litiges ouverts sur des prestations.</p>
      </div>

      <div v-if="litiges.length" class="-mx-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
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
            {{ compterParGroupe(filtre.id) }}
          </span>
        </button>
      </div>

      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" message="Impossible de charger vos litiges." @retry="charger" />
      <EmptyState
        v-else-if="!litiges.length"
        title="Aucun litige"
        message="Vous n'avez ouvert aucun litige. Un litige peut être signalé depuis le détail d'une demande acceptée ou terminée."
      />
      <EmptyState v-else-if="!litigesFiltres.length" title="Aucun litige dans cette catégorie" message="Essayez un autre filtre." />

      <div v-else class="grid gap-4">
        <LitigeCard v-for="litige in litigesFiltres" :key="litige.id" :litige="litige" role="CLIENT" @maj="charger" />
      </div>
    </div>
  </ClientLayout>
</template>
