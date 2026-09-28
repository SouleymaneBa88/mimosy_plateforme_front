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
import { ref } from 'vue'
import { defineStore } from 'pinia'

import * as realtime from '@/services/realtime'
import { useNotificationsStore } from '@/stores/notifications'

export const useRealtimeStore = defineStore('realtime', () => {
  const etat = ref('disconnected')
  let desabonnements = []

  function demarrer() {
    if (!localStorage.getItem('mimosy_access_token')) return
    if (!desabonnements.length) {
      const notifications = useNotificationsStore()
      const recharger = () => notifications.chargerNotifications()
      desabonnements = [
        realtime.ecouter('notification.nouvelle', recharger),
        realtime.ecouter('realtime.reconnecte', recharger),
      ]
    }
    realtime.demarrer((nouvelEtat) => {
      etat.value = nouvelEtat
    })
  }

  function arreter() {
    realtime.arreter()
    desabonnements.forEach((desabonner) => desabonner())
    desabonnements = []
  }

  return { etat, demarrer, arreter }
})
