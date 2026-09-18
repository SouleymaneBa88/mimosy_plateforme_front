<script setup>
import { computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const userName = computed(() => [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ') || 'Prestataire')
</script>

<template>
  <AppLayout role="prestataire">
    <div class="mx-auto flex w-full  flex-col gap-7">
      <ClientHeader title="Rendez-vous" subtitle="Organisez vos prochaines interventions." :user-name="userName" profile-path="/prestataire/profil" />
      <EmptyState
        title="Endpoint rendez-vous manquant"
        message="Le backend actuel n'expose pas encore de ressource rendez-vous connectable à cette page."
      />
    </div>
  </AppLayout>
</template>
