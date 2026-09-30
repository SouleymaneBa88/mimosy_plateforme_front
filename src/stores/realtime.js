/**
 * État de la connexion temps réel, partagé par toute l'application.
 *
 * etat : 'disconnected' | 'connecting' | 'connected' | 'error'
 *
 * Les notifications sont gérées ici une fois pour toutes : à chaque
 * « notification.nouvelle » (ou après une reconnexion), la liste est
 * rechargée par REST ; le badge des headers se met alors à jour seul.
 * Les autres écrans s'abonnent eux-mêmes à leurs événements
 * (composables/useEvenementTempsReel.js).
 */
// ref : pour créer une donnée réactive.
import { ref } from 'vue'
// defineStore : pour créer un store Pinia.
import { defineStore } from 'pinia'

// Les fonctions de bas niveau qui gèrent le WebSocket.
import * as realtime from '@/services/realtime'
// Le store des notifications (à recharger quand une notification arrive).
import { useNotificationsStore } from '@/stores/notifications'

export const useRealtimeStore = defineStore('realtime', () => {
  // L'état actuel de la connexion (affiché dans l'interface).
  const etat = ref('disconnected')
  // Les fonctions pour se désabonner des événements.
  let desabonnements = []

  // Démarre la connexion temps réel.
  function demarrer() {
    // Pas connecté à l'application : on ne fait rien.
    if (!localStorage.getItem('mimosy_access_token')) return
    // On s'abonne une seule fois aux événements utiles.
    if (!desabonnements.length) {
      const notifications = useNotificationsStore()
      const recharger = () => notifications.chargerNotifications()
      desabonnements = [
        realtime.ecouter('notification.nouvelle', recharger),
        realtime.ecouter('realtime.reconnecte', recharger),
      ]
    }
    // On démarre la connexion et on met à jour "etat" à chaque changement.
    realtime.demarrer((nouvelEtat) => {
      etat.value = nouvelEtat
    })
  }

  // Arrête la connexion et se désabonne de tout.
  function arreter() {
    realtime.arreter()
    desabonnements.forEach((desabonner) => desabonner())
    desabonnements = []
  }

  return { etat, demarrer, arreter }
})
