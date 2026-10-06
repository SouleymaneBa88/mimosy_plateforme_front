<script setup>
/**
 * Sidebar PRESTATAIRE / ADMIN. Alignée sur le design system MIMOSY
 * (tokens de couleur, police, rayons) établi pour le CLIENT — mêmes
 * variables `--color-mimosy-*` et `--font-*`, plutôt que des couleurs en
 * dur proches mais non identiques. Logique de navigation, tiroir mobile
 * et déconnexion inchangées.
 */
// Outils Vue, routeur et icônes.
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, Menu, X } from 'lucide-vue-next'

// Le menu selon le rôle, et les stores du profil et de la connexion.
import { getNavigationByRole } from '@/config/navigator'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useAuthStore } from '@/stores/auth'

// Le routeur et la route actuelle.
const router = useRouter()
const route = useRoute()

// Les stores utilisés.
const clientProfilStore = useClientProfilStore()
const authStore = useAuthStore()

// Props : le rôle (pour choisir le menu) et un nom à afficher (facultatif).
const props = defineProps({
  role: {
    type: String,
    default: 'client',
    validator: (value) => ['client', 'prestataire', 'admin'].includes(value),
  },
  // Permet de forcer le nom affiché depuis le layout parent si besoin
  userName: {
    type: String,
    default: '',
  },
})

/* ---------------------------------------------
 * Navigation
 * ------------------------------------------- */
const menuItems = computed(() => getNavigationByRole(props.role))

/* ---------------------------------------------
 * Utilisateur affiché (selon le rôle)
 * ------------------------------------------- */
// Le nom de l'utilisateur tiré du store de connexion.
const nomDepuisAuth = computed(() => {
  const user = authStore.user || {}
  if (user.nomComplet) return user.nomComplet
  const complet = [user.prenom, user.nom].filter(Boolean).join(' ')
  return complet || user.email || ''
})

// Le nom affiché selon le rôle.
const displayName = computed(() => {
  if (props.userName) return props.userName

  switch (props.role) {
    case 'client':
      return clientProfilStore.nomComplet || nomDepuisAuth.value
    case 'prestataire':
    case 'admin':
    default:
      return nomDepuisAuth.value
  }
})

// Le libellé du rôle ("Client", "Prestataire", "Administrateur").
const roleLabel = computed(() => {
  const roles = {
    client: 'Client',
    prestataire: 'Prestataire',
    admin: 'Administrateur',
  }

  return roles[props.role] || props.role
})

// Initiale(s) pour l'avatar de repli (aucune photo disponible pour
// PRESTATAIRE/ADMIN dans les stores actuels : jamais une image inventée,
// seulement l'initiale du vrai nom affiché).
const initiales = computed(() => {
  const nom = displayName.value.trim()
  if (!nom) return '?'
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('')
})

/* ---------------------------------------------
 * Responsive : menu mobile (tiroir)
 * ------------------------------------------- */
const isMobileOpen = ref(false)

// Ouvrir, fermer ou basculer le menu mobile.
const openMenu = () => {
  isMobileOpen.value = true
}

const closeMenu = () => {
  isMobileOpen.value = false
}

const toggleMenu = () => {
  isMobileOpen.value = !isMobileOpen.value
}

// Bloque le scroll de la page quand le tiroir est ouvert
watch(isMobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// Ferme le tiroir à chaque changement de page
watch(
  () => route.fullPath,
  () => closeMenu(),
)

// Touche Échap : ferme le menu mobile.
const onKeydown = (event) => {
  if (event.key === 'Escape' && isMobileOpen.value) {
    closeMenu()
  }
}

// Si on repasse en desktop, on ferme le tiroir
const desktopQuery =
  typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null

const onBreakpointChange = (event) => {
  if (event.matches) closeMenu()
}

// Au montage : on écoute le clavier et la largeur de l'écran.
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  desktopQuery?.addEventListener('change', onBreakpointChange)
})

// Au démontage : on arrête d'écouter et on débloque le défilement.
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  desktopQuery?.removeEventListener('change', onBreakpointChange)
  document.body.style.overflow = ''
})

/* ---------------------------------------------
 * Actions
 * ------------------------------------------- */
// Le lien est-il celui de la page actuelle ?
// "alias" : autres chemins rattachés à la même entrée de menu (ex. la file
// des documents fait partie de « Vérifications »).
const isActive = (path, alias = []) => {
  if (route.path === path) {
    return true
  }

  if (alias.some((chemin) => route.path === chemin || route.path.startsWith(`${chemin}/`))) {
    return true
  }

  // "Accueil" (chemin racine du rôle, ex. /prestataire ou /admin) est un
  // préfixe de TOUTES les autres routes du rôle : sans ce garde-fou, il
  // resterait actif en même temps que n'importe quelle autre page (ex.
  // /prestataire/demandes commence bien par "/prestataire/"). Seul un
  // chemin exact peut l'activer, jamais une correspondance de préfixe.
  if (path === `/${props.role}`) {
    return false
  }

  return route.path.startsWith(`${path}/`)
}

// Va à la page cliquée (si ce n'est pas déjà la page actuelle), puis ferme le menu mobile.
const handleNavigation = (path) => {
  if (route.path !== path) {
    router.push(path)
  }
  closeMenu()
}

// Déconnexion, puis retour à la page de connexion.
const handleLogout = async () => {
  closeMenu()
  await authStore.logout()
  router.push('/login')
}

// Retour à la page d'accueil publique.
const goHome = () => {
  closeMenu()
  router.push('/')
}
</script>

<template>
  <!-- Barre du haut (mobile / tablette uniquement) -->
  <header
    class="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-mimosy-border bg-mimosy-alt px-4 lg:hidden"
  >
    <button
      type="button"
      class="flex items-center rounded-md transition hover:opacity-80"
      aria-label="Retour à l'accueil"
      title="Retour à l'accueil"
      @click="goHome"
    >
      <img
        src="/images/mimosy_logo_transparent.png"
        alt="MIMOSY"
        class="h-auto w-[120px] object-contain"
      />
    </button>

    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-lg text-mimosy-text transition hover:bg-mimosy-page"
      :aria-label="isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
      :aria-expanded="isMobileOpen"
      aria-controls="app-sidebar"
      @click="toggleMenu"
    >
      <X
        v-if="isMobileOpen"
        class="h-5 w-5"
        :stroke-width="2"
      />
      <Menu
        v-else
        class="h-5 w-5"
        :stroke-width="2"
      />
    </button>
  </header>

  <!-- Fond sombre derrière le tiroir (mobile) -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 z-40 bg-mimosy-text/40 lg:hidden"
      aria-hidden="true"
      @click="closeMenu"
    />
  </Transition>

  <!-- Sidebar -->
  <aside
    id="app-sidebar"
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85vw] flex-col border-r border-mimosy-border bg-mimosy-alt shadow-sm',
      'transition-transform duration-300 ease-out motion-reduce:transition-none',
      'lg:translate-x-0',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
    :aria-label="`Espace ${roleLabel}`"
  >
    <!-- Logo -->
    <div class="flex items-center justify-between px-8 py-8">
      <button
        type="button"
        class="flex items-center rounded-md transition hover:opacity-80"
        aria-label="Retour à l'accueil"
        title="Retour à l'accueil"
        @click="goHome"
      >
        <img
          src="/images/mimosy_logo_transparent.png"
          alt="MIMOSY"
          class="h-auto w-[175px] object-contain"
        />
      </button>
    </div>

    <!-- Utilisateur connecté -->
    <div
      v-if="displayName"
      class="flex items-center gap-3 px-8 pb-6"
    >
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mimosy-primaryBg font-serif text-base text-mimosy-primary">
        {{ initiales }}
      </span>
      <div class="min-w-0">
        <p class="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-mimosy-secondary">
          Espace {{ roleLabel }}
        </p>
        <p
          class="mt-0.5 truncate font-sans text-sm font-semibold text-mimosy-text"
          :title="displayName"
        >
          {{ displayName }}
        </p>
      </div>
    </div>

    <!-- Navigation -->
    <nav
      class="flex flex-1 flex-col gap-1 overflow-y-auto px-4"
      aria-label="Navigation principale"
    >
      <button
        v-for="item in menuItems"
        :key="item.path"
        type="button"
        :class="[
          'group flex min-h-[45px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left',
          'transition-colors duration-200',
          isActive(item.path, item.alias)
            ? 'bg-mimosy-primary text-white'
            : 'text-mimosy-text hover:bg-mimosy-page',
        ]"
        :aria-current="isActive(item.path, item.alias) ? 'page' : undefined"
        :aria-label="item.label"
        :title="item.label"
        @click="handleNavigation(item.path)"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <component
            :is="item.icon"
            class="h-[18px] w-[18px]"
            :stroke-width="2"
          />
        </span>

        <span
          class="truncate font-sans text-sm font-medium leading-[21px]"
        >
          {{ item.label }}
        </span>
      </button>
    </nav>

    <!-- Zone basse -->
    <div
      class="border-t border-mimosy-border px-4 py-4"
    >
      <!-- Déconnexion -->
      <button
        type="button"
        class="flex min-h-[45px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-sans text-sm font-medium text-[#A85148] transition-colors duration-200 hover:bg-[#FFF0EE]"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        @click="handleLogout"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <LogOut
            class="h-[18px] w-[18px]"
            :stroke-width="2"
          />
        </span>

        <span class="leading-[21px]">
          Se déconnecter
        </span>
      </button>
    </div>
  </aside>
</template>
