<script setup>
/**
 * Navigation principale du CLIENT.
 *
 * Structure, disposition et comportement repris de
 * front_mimosy/src/components/clients/Header.vue (nav horizontale figée à
 * 5 entrées, menu profil déroulant, menu mobile) — mais entièrement
 * connectée aux données réelles de MIMOSY : routes réelles du router,
 * authStore (déconnexion réelle), clientProfilStore (nom/photo réels) et
 * notificationService (notifications réelles, jamais de compteur inventé).
 *
 * Le menu est volontairement limité à 5 entrées (voir consigne produit) :
 * Rendez-vous, Diagnostic, Paiement et Profil restent accessibles depuis
 * les parcours concernés plutôt que depuis ce menu principal.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronDown, LogOut, Menu, Settings, UserRound, X } from 'lucide-vue-next'

import NotificationButton from '@/components/notifications/NotificationButton.vue'
import NotificationPanel from '@/components/notifications/NotificationPanel.vue'
import PhotoProfil from '@/components/client/PhotoProfil.vue'
import { useAuthStore } from '@/stores/auth'
import { useClientProfilStore } from '@/stores/clientProfil'
import { destinationNotification, useNotificationsStore } from '@/stores/notifications'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const clientProfilStore = useClientProfilStore()
const notificationsStore = useNotificationsStore()

const menuOuvert = ref(false)
const menuProfilOuvert = ref(false)
const conteneurProfil = ref(null)
const notificationsOpen = ref(false)

// Routes réelles du router CLIENT (mimosy/src/router/index.js), pas les
// routes fictives de front_mimosy.
const navigation = [
  { label: 'Accueil', path: '/client' },
  { label: 'Demandes', path: '/client/demandes' },
  { label: 'Mes devis', path: '/client/devis' },
  { label: 'Messages', path: '/messages' },
  { label: 'Litiges', path: '/client/litiges' },
]

const displayName = computed(() => clientProfilStore.nomComplet)
const displayAvatar = computed(() => clientProfilStore.photoProfil)
const unreadCount = computed(() => notificationsStore.nombreNonLues)

// Le panneau n'affiche que les non-lues (voir consigne produit), mises à
// la forme attendue par NotificationPanel.vue (date déjà formatée).
const notificationsAffichees = computed(() =>
  notificationsStore.nonLues.map((notification) => ({
    id: notification.id,
    titre: notification.titre,
    message: notification.message,
    date: notification.date_creation ? new Date(notification.date_creation).toLocaleString('fr-FR') : '',
  })),
)

function estActif(chemin) {
  if (chemin === '/client') return route.path === '/client'
  return route.path.startsWith(chemin)
}

function fermerMenuProfilSiExterieur(evenement) {
  if (conteneurProfil.value && !conteneurProfil.value.contains(evenement.target)) {
    menuProfilOuvert.value = false
  }
}

/**
 * Clic sur une notification du panneau :
 *   1. on retrouve la notification réelle (pour connaître son `type`) ;
 *   2. on la marque comme lue côté API (elle disparaît alors du panneau,
 *      qui ne montre que les non-lues) ;
 *   3. on redirige vers la liste concernée par son type — jamais vers un
 *      identifiant de ressource précis, qui n'existe pas dans l'API
 *      actuelle (voir stores/notifications.js).
 * Si le marquage comme lu échoue (réseau, backend), la navigation a lieu
 * quand même : ce n'est pas à un problème de synchronisation de
 * notification d'empêcher l'utilisateur d'atteindre sa page.
 */
async function ouvrirNotification(id) {
  const notification = notificationsStore.notifications.find((item) => item.id === id)
  notificationsOpen.value = false

  await notificationsStore.marquerCommeLue(id)

  const destination = destinationNotification(notification)
  if (destination) router.push(destination)
}

async function seDeconnecter() {
  menuProfilOuvert.value = false
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('click', fermerMenuProfilSiExterieur)
  notificationsStore.chargerNotifications()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', fermerMenuProfilSiExterieur)
})

// Fermeture automatique des menus (mobile + profil) après navigation,
// comme dans la référence front_mimosy.
watch(
  () => route.path,
  () => {
    menuOuvert.value = false
    menuProfilOuvert.value = false
    notificationsOpen.value = false
  },
)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-mimosy-border bg-mimosy-surface">
    <div class="mx-auto flex h-20 w-full items-center justify-between px-4 sm:px-8">
      <!-- Logo + navigation -->
      <div class="flex h-full items-center gap-12">
        <RouterLink to="/client" class="flex h-[52px] w-[150px] items-center px-[10px] transition hover:opacity-80 sm:w-[195px]" aria-label="Retour à l'accueil">
          <img src="/images/mimosy_logo_transparent.png" alt="MIMOSY" class="h-[52px] w-auto object-contain" />
        </RouterLink>

        <!-- Navigation (desktop) -->
        <nav class="hidden h-full items-center gap-6 text-mimosy-secondary lg:flex hover:text-mimosy-text" aria-label="Navigation principale">
          <RouterLink
            v-for="item in navigation"
            :key="item.path"
            :to="item.path"
            class="flex h-full items-center border-b-2 border-transparent px-1 font-sans text-sm font-medium transition-colors duration-200"
            :class="estActif(item.path) ? 'border-mimosy-primary font-bold text-mimosy-text' : 'text-mimosy-secondary hover:text-mimosy-text'"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>

      <!-- Partie droite -->
      <div class="flex items-center gap-3 sm:gap-6">
        <!-- Notifications -->
        <div class="relative flex h-10 items-center border-mimosy-border pr-0 sm:border-r sm:pr-6">
          <NotificationButton :count="unreadCount" @click="notificationsOpen = !notificationsOpen" />
          <NotificationPanel v-model="notificationsOpen" :notifications="notificationsAffichees" :loading="notificationsStore.isLoading" @read="ouvrirNotification" />
        </div>

        <!-- Profil (desktop) -->
        <div ref="conteneurProfil" class="relative hidden sm:block">
          <button
            type="button"
            class="-m-1.5 flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-mimosy-page"
            aria-haspopup="true"
            :aria-expanded="menuProfilOuvert"
            aria-label="Ouvrir le menu du profil"
            @click="menuProfilOuvert = !menuProfilOuvert"
          >
            <span class="font-sans text-xs font-bold leading-[18px] text-mimosy-text">
              {{ displayName }}
            </span>

            <PhotoProfil :photo="displayAvatar" :name="displayName" size="small" :editable="false" />

            <ChevronDown :size="14" :stroke-width="2" class="text-mimosy-secondary transition" :class="menuProfilOuvert ? 'rotate-180' : ''" />
          </button>

          <!-- Menu déroulant -->
          <div
            v-if="menuProfilOuvert"
            class="absolute right-0 top-[calc(100%+12px)] z-20 w-56 rounded-2xl border border-mimosy-border bg-mimosy-surface p-2 shadow-lg"
          >
            <RouterLink
              to="/client/profil"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-sm font-medium text-mimosy-text transition hover:bg-mimosy-page"
            >
              <UserRound :size="16" :stroke-width="1.8" />
              Mon profil
            </RouterLink>

            <!-- "Paramètres" pointe vers la même page réelle que "Mon profil"
                 (profilParametre.vue regroupe déjà profil ET paramètres de
                 compte) : mimosy n'a pas de route de paramètres distincte,
                 on n'en invente pas une. -->
            <!-- <RouterLink
              to="/client/profil"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-sm font-medium text-mimosy-text transition hover:bg-mimosy-page"
            >
              <Settings :size="16" :stroke-width="1.8" />
              Paramètres
            </RouterLink> -->

            <div class="my-1.5 h-px bg-mimosy-border" />

            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-sans text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE]"
              @click="seDeconnecter"
            >
              <LogOut :size="16" :stroke-width="1.8" />
              Déconnexion
            </button>
          </div>
        </div>

        <!-- Bouton menu mobile -->
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-lg text-mimosy-text transition hover:bg-mimosy-page lg:hidden"
          :aria-expanded="menuOuvert"
          aria-label="Ouvrir le menu"
          @click="menuOuvert = !menuOuvert"
        >
          <Menu v-if="!menuOuvert" :size="22" :stroke-width="1.8" />
          <X v-else :size="22" :stroke-width="1.8" />
        </button>
      </div>
    </div>

    <!-- Navigation (mobile) -->
    <nav v-if="menuOuvert" class="flex flex-col gap-1 border-t border-mimosy-border bg-mimosy-surface px-4 py-3 lg:hidden" aria-label="Navigation principale mobile">
      <RouterLink
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        class="rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors duration-200"
        :class="estActif(item.path) ? 'bg-mimosy-primaryBg font-bold text-mimosy-primary' : 'text-mimosy-secondary hover:bg-mimosy-page hover:text-mimosy-text'"
      >
        {{ item.label }}
      </RouterLink>

      <RouterLink
        to="/client/profil"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-mimosy-secondary hover:bg-mimosy-page hover:text-mimosy-text"
      >
        <PhotoProfil :photo="displayAvatar" :name="displayName" size="small" :editable="false" />
        {{ displayName }}
      </RouterLink>

      <div class="my-1 h-px bg-mimosy-border" />

      <button
        type="button"
        class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-sans text-sm font-bold text-[#A85148] hover:bg-[#FFF0EE]"
        @click="seDeconnecter"
      >
        <LogOut :size="16" :stroke-width="1.8" />
        Déconnexion
      </button>
    </nav>
  </header>
</template>
