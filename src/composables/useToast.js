/**
 * Toasts transitoires (succès/erreur) pour les actions admin.
 *
 * État module-level volontairement partagé par toute l'application :
 * une seule pile de toasts, affichée par un unique <ToastContainer />
 * monté dans AppLayout, quel que soit l'écran qui appelle pushToast().
 */
import { ref } from 'vue'

// La liste des toasts affichés (partagée par toute l'application).
const toasts = ref([])
// Compteur pour donner un identifiant unique à chaque toast.
let prochainId = 1

export function useToast() {
  // Ajoute un toast et le retire automatiquement après "duree" millisecondes.
  function pushToast(message, type = 'success', duree = 4000) {
    const id = prochainId++
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), duree)
    return id
  }

  // Retire un toast de la liste.
  function removeToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    toasts,
    pushToast,
    removeToast,
    // Raccourcis : succes('...') et erreur('...').
    succes: (message) => pushToast(message, 'success'),
    erreur: (message) => pushToast(message, 'error'),
  }
}
