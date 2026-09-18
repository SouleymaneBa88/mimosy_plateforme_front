<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import PhotoProfil from '@/components/client/PhotoProfil.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import NotificationButton from '@/components/notifications/NotificationButton.vue'
import NotificationPanel from '@/components/notifications/NotificationPanel.vue'
import * as notificationService from '@/services/notificationService'

const props = defineProps({
  userName: {
    type: String,
    default: '',
  },

  // Remplace le "Bonjour, {userName}" par défaut quand on a besoin d'un titre de page (ex: "Trouver un prestataire")
  title: {
    type: String,
    default: '',
  },

  // Remplace la ligne d'adresse par un texte libre (ex: un sous-titre d'accroche)
  subtitle: {
    type: String,
    default: '',
  },

  address: {
    type: String,
    default: '',
  },

  avatar: {
    type: String,
    default: '',
  },

  notificationCount: {
    type: Number,
    default: 0,
  },

  profilePath: {
    type: String,
    default: '/client/profil',
  },
})

const router = useRouter()
const clientProfilStore = useClientProfilStore()
const notificationsOpen = ref(false)
const notifications = ref([])
const notificationError = ref('')
const unreadNotifications = computed(() => notifications.value.filter((notification) => !notification.lue).length)

// Le header utilise le profil global, sauf si une page fournit explicitement une valeur.
const displayName = computed(() => props.userName || clientProfilStore.nomComplet)
const displayAvatar = computed(() => props.avatar || clientProfilStore.photoProfil)

function ouvrirProfil() {
  router.push(props.profilePath)
}

async function chargerNotifications() {
  notificationError.value = ''
  try {
    const data = await notificationService.listNotifications()
    notifications.value = (Array.isArray(data) ? data : data?.results || []).map((notification) => ({
      id: notification.id,
      titre: notification.titre,
      message: notification.message,
      date: notification.date_creation ? new Date(notification.date_creation).toLocaleString('fr-FR') : '',
      lue: notification.lu,
    }))
  } catch (error) {
    notificationError.value = error.message
  }
}

async function marquerNotificationLue(id) {
  const notification = notifications.value.find((item) => item.id === id)
  if (!notification || notification.lue) return

  try {
    await notificationService.markNotificationRead(id)
    notification.lue = true
  } catch (error) {
    notificationError.value = error.message
  }
}

onMounted(() => chargerNotifications())
</script>

<template>
  <header class="flex w-full items-start justify-between gap-4 sm:items-center sm:gap-6">
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-[22px] font-extrabold leading-8 tracking-[0.03px] text-[#051F20] sm:text-[25px] sm:leading-9 lg:text-[28px] lg:leading-[42px]">
        {{ title || `Bonjour, ${displayName}` }}
      </h1>

      <p
        v-if="subtitle || address"
        class="mt-1 line-clamp-2 text-[13px] font-normal leading-5 text-[#64748B] sm:text-[14px] sm:leading-[21px]"
      >
        {{ subtitle || `Votre adresse : ${address}` }}
      </p>
    </div>

    <div class="relative flex shrink-0 items-center gap-2 sm:gap-3">
      <!-- Notifications -->
      <NotificationButton :count="notificationCount || unreadNotifications" @click="notificationsOpen = !notificationsOpen" />
      <NotificationPanel v-model="notificationsOpen" :notifications="notifications" @read="marquerNotificationLue" />

      <!-- Avatar -->
      <button
        type="button"
        aria-label="Profil"
        class="shrink-0"
        @click="ouvrirProfil"
      >
        <PhotoProfil :photo="displayAvatar" :name="displayName" size="small" :editable="false" />
      </button>
    </div>
  </header>
</template>
