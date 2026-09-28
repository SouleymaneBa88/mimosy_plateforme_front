/**
 * Recharger un écran quand un événement temps réel le concerne.
 *
 *   useEvenementTempsReel(['demande.nouvelle', 'demande.statut'], charger)
 *
 * L'abonnement suit la vie du composant (ajouté au montage, retiré au
 * démontage). « realtime.reconnecte » est toujours inclus : après une
 * coupure, des événements ont pu être manqués, l'écran se resynchronise
 * par REST.
 *
 * La fonction reçoit l'événement ({ type, id, statut?, etape? }) mais ne doit
 * s'en servir que pour décider quoi recharger : les données affichées
 * viennent toujours de l'API REST.
 */
import { onBeforeUnmount, onMounted } from 'vue'

import { ecouter } from '@/services/realtime'

export function useEvenementTempsReel(types, action) {
  let desabonnements = []

  onMounted(() => {
    desabonnements = [...types, 'realtime.reconnecte'].map((type) => ecouter(type, action))
  })

  onBeforeUnmount(() => {
    desabonnements.forEach((desabonner) => desabonner())
    desabonnements = []
  })
}
