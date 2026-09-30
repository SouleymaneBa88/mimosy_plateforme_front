<!--
  Page "Mes litiges" du prestataire : la liste des litiges ouverts sur ses prestations.
  Chaque litige est affiché avec le composant LitigeCard.
-->
<script setup>
// Outils Vue.
import { onMounted, ref } from 'vue'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import LitigeCard from '@/components/disputes/LitigeCard.vue'
// Appels à l'API des litiges et abonnement au temps réel.
import * as disputeService from '@/services/disputeService'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'

// La liste des litiges, et les états de chargement et d'erreur.
const litiges = ref([])
const loading = ref(false)
const errorMessage = ref('')

// Charge les litiges depuis le serveur.
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

// On charge au montage, et on recharge à chaque événement "litige" reçu en temps réel.
onMounted(charger)
useEvenementTempsReel(['litige.nouveau', 'litige.statut', 'litige.preuve'], () => charger())
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Mes litiges" subtitle="Suivez les litiges ouverts sur vos prestations." />

      <!-- États : chargement, erreur, vide, ou liste des litiges. -->
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
