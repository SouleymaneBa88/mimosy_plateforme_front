<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { getNavigationByRole } from '@/config/navigator'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const clientProfilStore = useClientProfilStore()
const authStore = useAuthStore()

const props = defineProps({
  role: {
    type: String,
    default: 'client',
  },
})

const menuItems = computed(() => getNavigationByRole(props.role))
const displayName = computed(() => clientProfilStore.nomComplet)

const isActive = (path) => route.path === path

const handleNavigation = (path) => router.push(path)
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
const goHome = () => router.push('/')
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-50 flex w-[76px] flex-col bg-[#051F20] lg:w-[280px]">
    <!-- Logo -->
    <div class="flex justify-center px-3 pt-6 lg:justify-start lg:px-6 lg:pt-7">
      <button type="button" class="flex items-center gap-3" aria-label="Retour à l'accueil" @click="goHome">
        <span class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#2F6250] text-base font-bold text-white">
          M
        </span>
        <span class="hidden font-['Plus_Jakarta_Sans'] text-[21px] font-extrabold text-white lg:block">
          MIMOSY
        </span>
      </button>
    </div>

    <!-- Utilisateur connecté (visible seulement quand la sidebar est étendue) -->
    <div class="hidden px-6 pt-8 lg:block">
      <p class="text-xs uppercase tracking-[0.05em] text-[#64748B]">
        Espace {{ props.role }}
      </p>
      <p class="mt-1 truncate text-base font-bold text-white">
        {{ displayName }}
      </p>
    </div>

    <!-- Navigation -->
    <nav class="mt-8 flex flex-1 flex-col gap-2 px-3 lg:px-4" aria-label="Navigation principale">
      <button
        v-for="item in menuItems"
        :key="item.path"
        type="button"
        class="flex h-11 w-full items-center justify-center gap-5 rounded-[10px] px-3 text-left transition lg:justify-start"
        :class="isActive(item.path) ? 'bg-[#2F6250] text-white' : 'text-[#64748B] hover:bg-white/5 hover:text-white'"
        :aria-label="item.label"
        :title="item.label"
        @click="handleNavigation(item.path)"
      >
        <span class="flex h-5 w-5 shrink-0 items-center justify-center">
          <component :is="item.icon" class="h-5 w-5" :stroke-width="2" />
        </span>
        <span class="hidden truncate text-sm font-medium lg:block">
          {{ item.label }}
        </span>
      </button>
    </nav>

    <!-- Déconnexion -->
    <div class="border-t border-white/10 px-3 py-5 lg:px-4">
      <button
        type="button"
        class="flex h-11 w-full items-center justify-center gap-3 rounded-[10px] px-3 text-[#64748B] transition hover:bg-white/5 hover:text-white lg:justify-start"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        @click="handleLogout"
      >
        <span class="flex h-5 w-5 shrink-0 items-center justify-center">
          <LogOut class="h-5 w-5" :stroke-width="2" />
        </span>
        <span class="hidden text-sm font-medium lg:block">
          Se déconnecter
        </span>
      </button>
    </div>
  </aside>
</template>
