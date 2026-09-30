<!--
  HeaderPrestataire : la barre du haut de l'espace prestataire.
  Elle affiche le titre de la page, la cloche des notifications
  et le nom + la photo du prestataire (lien vers son profil).
-->
<script setup>
// Outils Vue et routeur.
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Les composants de notifications et les stores utilisés.
import NotificationButton from '@/components/notifications/NotificationButton.vue'
import NotificationPanel from '@/components/notifications/NotificationPanel.vue'
import { useAuthStore } from '@/stores/auth'
import {
  destinationNotificationPrestataire,
  useNotificationsStore,
} from '@/stores/notifications'

// La route actuelle, le routeur, et les stores de connexion et de notifications.
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

/* ---------------------------------------------------------
 * Notifications
 * ------------------------------------------------------- */
// Le panneau des notifications est-il ouvert ?
const notificationsOpen = ref(false)

// Nombre de notifications non lues (pour la pastille).
const unreadCount = computed(() => notificationsStore.nombreNonLues)

// Le panneau n'affiche que les non-lues, mises à la forme attendue par
// NotificationPanel.vue (même logique que ClientNavbar.vue).
const notificationsAffichees = computed(() =>
  notificationsStore.nonLues.map((notification) => ({
    id: notification.id,
    titre: notification.titre,
    message: notification.message,
    date: notification.date_creation
      ? new Date(notification.date_creation).toLocaleString('fr-FR')
      : '',
  })),
)

// Clic sur une notification : on ferme le panneau, on la marque comme lue,
// puis on va sur la page concernée.
async function ouvrirNotification(id) {
  const notification = notificationsStore.notifications.find(
    (item) => item.id === id,
  )
  notificationsOpen.value = false

  await notificationsStore.marquerCommeLue(id)

  const destination = destinationNotificationPrestataire(notification)
  if (destination) router.push(destination)
}

// Au montage, on charge les notifications.
onMounted(() => {
  notificationsStore.chargerNotifications()
})

/* ---------------------------------------------------------
 * Titre de la page
 * ------------------------------------------------------- */
const TITRE_PAR_DEFAUT = 'Aperçu de l’activité'

// Le titre à afficher pour chaque adresse.
const pageTitles = {
  '/prestataire': TITRE_PAR_DEFAUT,
  '/prestataire/demandes': 'Demandes',
  '/prestataire/devis': 'Devis',
  '/prestataire/rendez-vous': 'Rendez-vous',
  '/prestataire/services': 'Services',
  '/prestataire/disponibilites': 'Disponibilités',
  '/prestataire/messages': 'Messages',
  '/prestataire/revenus': 'Revenus',
  '/prestataire/avis': 'Avis',
  '/prestataire/litiges': 'Litiges',
  '/prestataire/profil': 'Mon profil',
}

// Trouve aussi le titre quand l'URL contient un identifiant
// (ex. /prestataire/demandes/42 → « Demandes »).
const pageTitle = computed(() => {
  const currentPath = route.path

  if (pageTitles[currentPath]) {
    return pageTitles[currentPath]
  }

  const matchingPath = Object.keys(pageTitles)
    .filter((path) => path !== '/prestataire')
    .find((path) => currentPath.startsWith(`${path}/`))

  return matchingPath ? pageTitles[matchingPath] : TITRE_PAR_DEFAUT
})

/* ---------------------------------------------------------
 * Prestataire connecté
 * ------------------------------------------------------- */
// Le nom affiché : prénom + nom, sinon d'autres champs disponibles.
const displayName = computed(() => {
  const user = authStore.user || {}

  const prenomNom = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')

  return prenomNom || user.nom_complet || user.nom || user.username || ''
})

const roleLabel = 'Prestataire Expert'

// La photo de profil (si elle existe).
const photoProfil = computed(() => {
  const user = authStore.user || {}
  return user.photo_profil || user.photo || ''
})

// La première lettre du nom (affichée s'il n'y a pas de photo).
const initiale = computed(() => {
  return displayName.value
    ? displayName.value.charAt(0).toUpperCase()
    : 'P'
})
</script>

<template>
  <header
    class="flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-[#E5E7E2] bg-[#FAFAF8] px-4 sm:h-20 sm:px-6 lg:px-10"
  >
    <!-- Titre de la page -->
    <h2
      class="min-w-0 truncate font-['Instrument_Serif'] text-xl font-normal leading-7 text-[#1A1C1A] sm:text-2xl sm:leading-8"
    >
      {{ pageTitle }}
    </h2>

    <!-- Partie droite -->
    <div class="flex shrink-0 items-center">
      <!-- Notifications -->
      <div class="relative">
        <NotificationButton
          :count="unreadCount"
          :aria-expanded="notificationsOpen"
          @click="notificationsOpen = !notificationsOpen"
        />

        <NotificationPanel
          v-model="notificationsOpen"
          :notifications="notificationsAffichees"
          :loading="notificationsStore.isLoading"
          @read="ouvrirNotification"
        />
      </div>

      <!-- Profil -->
      <div class="ml-3 flex items-center sm:ml-6">
        <router-link
          to="/prestataire/profil"
          class="group flex items-center gap-3 rounded-[4px] border-l border-[#E5E7E2] py-1 pl-3 pr-1 transition-colors duration-200 hover:bg-[#E8ECE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 sm:pl-4"
          :aria-label="`Voir le profil de ${displayName || 'Prestataire'}`"
          :title="displayName || 'Prestataire'"
        >
          <!-- Nom + rôle (masqués sur mobile) -->
          <div class="hidden min-w-0 flex-col items-end sm:flex">
            <span
              class="max-w-[180px] truncate text-right font-['DM_Sans'] text-sm font-semibold leading-5 tracking-[0.05px] text-[#1A1C1A]"
            >
              {{ displayName || 'Prestataire' }}
            </span>

            <span
              class="text-right font-['DM_Sans'] text-xs font-normal leading-4 tracking-[0.06px] text-[#1A1C1A] opacity-60"
            >
              {{ roleLabel }}
            </span>
          </div>

          <!-- Photo ou initiale -->
          <img
            v-if="photoProfil"
            :src="photoProfil"
            alt=""
            class="h-9 w-9 shrink-0 rounded-full border border-[#E5E7E2] object-cover transition-colors group-hover:border-[#2D6A4F] sm:h-10 sm:w-10"
          />

          <div
            v-else
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E7E2] bg-white font-['DM_Sans'] text-sm font-semibold text-[#2D6A4F] transition-colors group-hover:border-[#2D6A4F] sm:h-10 sm:w-10"
            aria-hidden="true"
          >
            {{ initiale }}
          </div>
        </router-link>
      </div>
    </div>
  </header>
</template>