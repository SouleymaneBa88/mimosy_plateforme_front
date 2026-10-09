<script setup>
/**
 * Layout du CLIENT : navigation horizontale (ClientNavbar) au lieu de la
 * sidebar verticale (AppSidebar) utilisée par PRESTATAIRE/ADMIN. AppLayout
 * reste inchangé et continue de servir ces deux autres rôles.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'

import ClientNavbar from '@/components/layout/ClientNavbar.vue'
import ClientFooter from '@/components/layout/ClientFooter.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import MimoAssistant from '@/components/client/MimoAssistant.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useRealtimeStore } from '@/stores/realtime'

const clientProfilStore = useClientProfilStore()
const route = useRoute()
const router = useRouter()
const mimoOuvert = ref(false)
// La page Diagnostic contient déjà Mimo : pas de second panneau (ni de seconde voix).
const surPageMimo = computed(() => route.name === 'client-diagnostic')

function basculerMimo() {
  mimoOuvert.value = !mimoOuvert.value
}

function ouvrirMimo() {
  mimoOuvert.value = true
}

watch(() => route.query.mimo, (ouvrir) => {
  if (ouvrir !== '1') return
  ouvrirMimo()
  const query = { ...route.query }
  delete query.mimo
  router.replace({ query })
}, { immediate: true })

onMounted(() => {
  window.addEventListener('mimo:ouvrir', ouvrirMimo)
  useRealtimeStore().demarrer()
  if (!clientProfilStore.isLoaded && localStorage.getItem('mimosy_access_token')) {
    clientProfilStore.chargerProfil().catch(() => {})
  }
})

onBeforeUnmount(() => window.removeEventListener('mimo:ouvrir', ouvrirMimo))
</script>

<template>
  <div class="min-h-screen bg-mimosy-page">
    <ClientNavbar />

    <main>
      <slot />
    </main>

    <ClientFooter />
    <ToastContainer />

    <div v-if="!surPageMimo" class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <aside
        v-if="mimoOuvert"
        data-testid="mimo-panel"
        class="flex h-[min(82vh,720px)] w-[min(92vw,430px)] flex-col overflow-hidden rounded-[24px] border border-mimosy-border bg-mimosy-surface shadow-[0_18px_48px_rgba(28,36,32,0.14)]"
      >
        <div class="min-h-0 flex-1 overflow-hidden">
          <MimoAssistant fermable @fermer="basculerMimo" />
        </div>
      </aside>

      <button
        type="button"
        data-testid="mimo-launcher"
        class="group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-mimosy-primary shadow-[0_10px_24px_rgba(28,36,32,0.18)] transition hover:bg-[#24563f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mimosy-primary"
        :aria-label="mimoOuvert ? 'Fermer Mimo' : 'Ouvrir Mimo'"
        :aria-expanded="mimoOuvert"
        @click="basculerMimo"
      >
        <span class="absolute inset-0 animate-[mimo-pulse_2.4s_ease-in-out_infinite] rounded-full border border-white/70 motion-reduce:animate-none"></span>
        <span class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#38D39F] ring-2 ring-white">
          <span class="h-2 w-2 rounded-full bg-white"></span>
        </span>
        <span class="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
          <Sparkles :size="24" :stroke-width="2.2" />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes mimo-pulse {
  0% { transform: scale(0.92); opacity: 0.8; }
  70% { transform: scale(1.18); opacity: 0; }
  100% { transform: scale(1.2); opacity: 0; }
}
</style>
