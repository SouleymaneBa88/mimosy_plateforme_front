// ref / computed : outils de Vue pour créer des données réactives.
import { computed, ref } from 'vue'
// defineStore : crée un "store" Pinia (données partagées entre les pages).
import { defineStore } from 'pinia'
// Les fonctions qui parlent au serveur pour l'authentification.
import * as authService from '@/services/authService'

/** État global de session : identité réelle, tokens stockés et rôle backend. */
export const useAuthStore = defineStore('auth', () => {
  // L'utilisateur connecté (relu depuis le navigateur au démarrage).
  const user = ref(authService.getStoredUser())
  // true pendant une requête (pour afficher un chargement).
  const isLoading = ref(false)
  // Le dernier message d'erreur.
  const errorMessage = ref('')

  // Connecté = on a un jeton ET un utilisateur.
  const isAuthenticated = computed(() => Boolean(localStorage.getItem('mimosy_access_token') && user.value))
  // Le rôle de l'utilisateur : CLIENT, PRESTATAIRE ou ADMIN.
  const role = computed(() => user.value?.role || '')

  // Connexion.
  async function login(credentials) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await authService.login(credentials)
      user.value = data.user
      return data
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Inscription.
  async function register(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      return await authService.register(payload)
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Déconnexion.
  async function logout() {
    // Plus de session : on ferme aussi la connexion temps réel.
    const { useRealtimeStore } = await import('@/stores/realtime')
    useRealtimeStore().arreter()
    await authService.logout()
    user.value = null
  }

  // Ce que le store met à disposition des pages.
  return { user, role, isAuthenticated, isLoading, errorMessage, login, register, logout }
})
