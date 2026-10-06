// ref / computed : outils de Vue pour créer des données réactives.
import { computed, ref } from 'vue'
// defineStore : crée un "store" Pinia (données partagées entre les pages).
import { defineStore } from 'pinia'
// Les fonctions qui parlent au serveur pour l'authentification.
import * as authService from '@/services/authService'
// Lecture du profil (pour actualiser l'état de vérification de l'e-mail).
import { getProfile } from '@/services/profileService'

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
  // Connecté avec une adresse e-mail pas encore vérifiée. « === false » :
  // une ancienne session sans ce champ n'est pas bloquée par erreur ; les
  // administrateurs (créés par la plateforme) ne sont jamais concernés.
  // Ce n'est qu'un confort d'affichage : le backend refuse de toute façon
  // les actions protégées (403).
  const emailNonVerifie = computed(() =>
    isAuthenticated.value && user.value?.email_verified === false && role.value !== 'ADMIN'
  )
  // Prestataire dont le dossier n'est pas encore validé par l'administration :
  // il doit terminer son parcours « Vérifier mon profil professionnel ».
  // « === false » : une ancienne session sans ce champ n'est pas bloquée ;
  // le backend refuse de toute façon les actions professionnelles (403).
  const prestataireNonValide = computed(() =>
    isAuthenticated.value && role.value === 'PRESTATAIRE' && user.value?.prestataire_valide === false
  )

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

  // Après confirmation de l'e-mail : si ce compte est celui connecté ici,
  // on met à jour l'indicateur gardé dans le navigateur.
  function marquerEmailVerifie(email) {
    if (!user.value || user.value.email?.toLowerCase() !== String(email || '').toLowerCase()) return
    user.value = { ...user.value, email_verified: true }
    authService.storeUser(user.value)
  }

  // Relit le profil au serveur et met à jour l'état de vérification de l'e-mail
  // (ex. lien cliqué depuis un autre appareil). Renvoie true si l'adresse est vérifiée.
  async function rafraichirUtilisateur() {
    const profil = await getProfile()
    user.value = {
      ...user.value,
      email_verified: Boolean(profil?.email_verified),
      prestataire_valide: profil?.prestataire_valide ?? user.value?.prestataire_valide ?? null,
    }
    authService.storeUser(user.value)
    return user.value.email_verified
  }

  // Ce que le store met à disposition des pages.
  return {
    user,
    role,
    isAuthenticated,
    emailNonVerifie,
    prestataireNonValide,
    isLoading,
    errorMessage,
    login,
    register,
    logout,
    marquerEmailVerifie,
    rafraichirUtilisateur,
  }
})
