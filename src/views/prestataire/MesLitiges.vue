<script setup>
import { onMounted, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
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
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Mes litiges" subtitle="Suivez les litiges ouverts sur vos prestations." />

      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" message="Impossible de charger vos litiges." @retry="charger" />
      <EmptyState
        v-else-if="!litiges.length"
        title="Aucun litige"
        message="Aucun litige n'est ouvert. Un litige peut être signalé depuis le détail d'une demande acceptée ou terminée."
      />

      <div v-else class="grid gap-4">
        <LitigeCard v-for="litige in litiges" :key="litige.id" :litige="litige" role="PRESTATAIRE" @maj="charger" />
      </div>
    </div>
  </AppLayout>
</template>
