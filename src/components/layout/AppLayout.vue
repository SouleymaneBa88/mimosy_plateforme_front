<script setup>
import { onMounted } from 'vue'

import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useClientProfilStore } from '@/stores/clientProfil'

const props = defineProps({
  role: {
    type: String,
    default: 'client',
  },
})

const clientProfilStore = useClientProfilStore()

onMounted(() => {
  if (!clientProfilStore.isLoaded && localStorage.getItem('mimosy_access_token')) {
    clientProfilStore.chargerProfil().catch(() => {})
  }
})
</script>

<template>
  <div class="min-h-screen" :style="{ backgroundColor: 'var(--pp-bg, #FFFDF9)' }">
    <AppSidebar :role="props.role" />

    <!-- Le décalage à gauche suit la largeur de la sidebar : 76px en icône seule, 280px à partir de lg -->
    <main class="min-h-screen pl-[76px] transition-[padding] duration-300 ease-out lg:pl-[280px]">
      <div class="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 lg:px-10 lg:py-10 xl:px-12">
        <slot />
      </div>
    </main>
  </div>
</template>