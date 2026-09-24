/**
 * Toasts transitoires (succès/erreur) pour les actions admin.
 *
 * État module-level volontairement partagé par toute l'application :
 * une seule pile de toasts, affichée par un unique <ToastContainer />
 * monté dans AppLayout, quel que soit l'écran qui appelle pushToast().
 */
import { ref } from 'vue'

const toasts = ref([])
let prochainId = 1

export function useToast() {
  function pushToast(message, type = 'success', duree = 4000) {
    const id = prochainId++
    toasts.value.push({ id, message, type })
    setTimeout(() => removeToast(id), duree)
    return id
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    toasts,
    pushToast,
    removeToast,
    succes: (message) => pushToast(message, 'success'),
    erreur: (message) => pushToast(message, 'error'),
  }
}
