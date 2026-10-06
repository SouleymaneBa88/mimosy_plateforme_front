// Store Pinia des notifications (la cloche en haut de l'écran).
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

// Les fonctions qui appellent l'API des notifications.
import * as notificationService from '@/services/notificationService'

/**
 * Destination (route nommée) vers laquelle rediriger selon le type réel
 * d'une notification (voir apps.notifications.models.Notification.Type
 * côté Django — seul champ structuré disponible, aucun identifiant de
 * ressource n'existe dans l'API actuelle : la redirection se fait donc
 * vers la LISTE concernée, jamais vers un élément précis inventé, et
 * jamais en interprétant le texte libre titre/message.
 *
 * Si un jour le backend ajoute un identifiant de ressource (ex. un champ
 * demande_id / devis_id / litige_id), cette fonction sera le seul endroit
 * à adapter pour ouvrir directement l'élément concerné.
 */
const DESTINATION_PAR_TYPE = {
  DEMANDE_PRESTATION: { name: 'demandes' },
  REPONSE_PRESTATION: { name: 'demandes' },
  DEMANDE_DEVIS: { name: 'client-devis' },
  REPONSE_DEVIS: { name: 'client-devis' },
  MESSAGE: { name: 'messagerie' },
  RENDEZ_VOUS: { name: 'client-rendez-vous' },
  LITIGE: { name: 'client-litiges' },
  // Un avis concerne toujours une prestation déjà réalisée : la liste des
  // demandes reste la destination la plus pertinente (pas de page dédiée
  // aux avis côté client).
  AVIS: { name: 'demandes' },
  // Concepts prestataire/admin : un client peut techniquement recevoir ce
  // type au partage du même modèle, sans destination CLIENT pertinente.
  VERIFICATION: null,
  SIGNALEMENT: null,
}

// Renvoie la page où envoyer un CLIENT qui clique sur une notification (ou null).
export function destinationNotification(notification) {
  return DESTINATION_PAR_TYPE[notification?.type] || null
}

/**
 * Équivalent de DESTINATION_PAR_TYPE côté PRESTATAIRE : les mêmes types de
 * notification existent pour les deux rôles (voir apps.*.views côté Django,
 * qui créent une Notification aussi bien pour le client que pour le
 * prestataire selon l'événement), mais ne mènent pas aux mêmes routes.
 */
const DESTINATION_PAR_TYPE_PRESTATAIRE = {
  DEMANDE_PRESTATION: { name: 'prestataire-demandes' },
  REPONSE_PRESTATION: { name: 'prestataire-demandes' },
  DEMANDE_DEVIS: { name: 'prestataire-devis' },
  REPONSE_DEVIS: { name: 'prestataire-devis' },
  MESSAGE: { name: 'prestataire-messages' },
  RENDEZ_VOUS: { name: 'prestataire-rendez-vous' },
  LITIGE: { name: 'prestataire-litiges' },
  AVIS: { name: 'prestataire-avis' },
  VERIFICATION: { name: 'prestataire-parcours' },
  // Un signalement n'a pas de page de suivi dédiée côté prestataire (seule
  // l'administration le traite) : pas de destination à inventer.
  SIGNALEMENT: null,
}

// Même chose pour un PRESTATAIRE.
export function destinationNotificationPrestataire(notification) {
  return DESTINATION_PAR_TYPE_PRESTATAIRE[notification?.type] || null
}

// Le store lui-même.
export const useNotificationsStore = defineStore('notifications', () => {
  // La liste de toutes les notifications, l'état de chargement et l'erreur.
  const notifications = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  // Uniquement les notifications non lues, les plus récentes en premier
  // (l'API renvoie déjà ce tri) : c'est cette liste qu'affiche la cloche.
  const nonLues = computed(() => notifications.value.filter((notification) => !notification.lu))
  const nombreNonLues = computed(() => nonLues.value.length)

  // Charge les notifications depuis le serveur.
  async function chargerNotifications() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await notificationService.listNotifications()
      notifications.value = Array.isArray(data) ? data : data?.results || []
    } catch (error) {
      errorMessage.value = error.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Marque une notification comme lue côté API puis met à jour l'état
   * local (retire la notification des non-lues). Si l'appel échoue
   * (réseau, backend), l'état local n'est pas modifié — la notification
   * reste visible plutôt que de disparaître sans confirmation du serveur —
   * et l'erreur est renvoyée à l'appelant plutôt que jetée sans être
   * gérée, pour ne jamais casser une navigation en cours.
   */
  async function marquerCommeLue(id) {
    // On cherche la notification ; si elle n'existe pas ou est déjà lue, rien à faire.
    const notification = notifications.value.find((item) => item.id === id)
    if (!notification || notification.lu) return true

    try {
      // On prévient le serveur, puis on la marque comme lue dans l'affichage.
      await notificationService.markNotificationRead(id)
      notification.lu = true
      return true
    } catch (error) {
      errorMessage.value = error.message
      return false
    }
  }

  // Marque toutes les notifications comme lues (serveur puis affichage).
  async function marquerToutesLues() {
    try {
      await notificationService.markAllNotificationsRead()
      notifications.value.forEach((notification) => { notification.lu = true })
      return true
    } catch (error) {
      errorMessage.value = error.message
      return false
    }
  }

  return {
    notifications,
    isLoading,
    errorMessage,
    nonLues,
    nombreNonLues,
    chargerNotifications,
    marquerCommeLue,
    marquerToutesLues,
  }
})
