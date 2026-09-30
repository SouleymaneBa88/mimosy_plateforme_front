// ------------------------------------------------------------------
// Un "store" Pinia est un endroit où l'on range des données partagées
// par plusieurs pages. Ici : la liste des rendez-vous et des disponibilités.
// Chaque page peut lire ces données et appeler les fonctions du store.
// ------------------------------------------------------------------

// ref : pour créer une donnée réactive (l'affichage se met à jour tout seul).
import { ref } from 'vue'
// defineStore : pour créer un store Pinia.
import { defineStore } from 'pinia'
// Les fonctions qui appellent l'API des rendez-vous.
import * as rendezVousService from '@/services/rendezVousService'

/** Rendez-vous et disponibilités de l'utilisateur connecté (client ou prestataire). */
export const useRendezVousStore = defineStore('rendezVous', () => {
  // La liste des rendez-vous, l'état de chargement et le message d'erreur.
  const rendezVous = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  // La liste des disponibilités du prestataire, avec leur propre chargement et erreur.
  const disponibilites = ref([])
  const isLoadingDisponibilites = ref(false)
  const disponibilitesErrorMessage = ref('')

  // Charge la liste des rendez-vous depuis le serveur.
  async function chargerRendezVous() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await rendezVousService.listRendezVous()
      // On accepte une liste simple ou une réponse paginée.
      rendezVous.value = Array.isArray(data) ? data : data?.results || []
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Crée un rendez-vous et l'ajoute en haut de la liste.
  async function creerRendezVous(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const cree = await rendezVousService.createRendezVous(payload)
      rendezVous.value.unshift(cree)
      return cree
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Fonction commune pour changer le statut d'un rendez-vous.
  // "action" est le nom de la fonction du service à appeler.
  async function changerStatut(id, action) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      // On appelle le serveur, puis on remplace le rendez-vous dans la liste.
      const misAJour = await rendezVousService[action](id)
      const index = rendezVous.value.findIndex((item) => item.id === id)
      if (index >= 0) rendezVous.value[index] = misAJour
      return misAJour
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Les 4 actions possibles, écrites en une ligne chacune grâce à changerStatut.
  const confirmer = (id) => changerStatut(id, 'confirmRendezVous')
  const refuser = (id) => changerStatut(id, 'refuseRendezVous')
  const annuler = (id) => changerStatut(id, 'cancelRendezVous')
  const terminer = (id) => changerStatut(id, 'completeRendezVous')

  // Charge les disponibilités du prestataire connecté.
  async function chargerMesDisponibilites() {
    isLoadingDisponibilites.value = true
    disponibilitesErrorMessage.value = ''
    try {
      const data = await rendezVousService.listMesDisponibilites()
      disponibilites.value = Array.isArray(data) ? data : data?.results || []
    } catch (error) {
      disponibilitesErrorMessage.value = error.message
      throw error
    } finally {
      isLoadingDisponibilites.value = false
    }
  }

  // Ajoute une disponibilité.
  async function creerDisponibilite(payload) {
    disponibilitesErrorMessage.value = ''
    try {
      const creee = await rendezVousService.createDisponibilite(payload)
      disponibilites.value.push(creee)
      return creee
    } catch (error) {
      disponibilitesErrorMessage.value = error.message
      throw error
    }
  }

  // Modifie une disponibilité et la remplace dans la liste.
  async function modifierDisponibilite(id, payload) {
    disponibilitesErrorMessage.value = ''
    try {
      const modifiee = await rendezVousService.updateDisponibilite(id, payload)
      const index = disponibilites.value.findIndex((item) => item.id === id)
      if (index >= 0) disponibilites.value[index] = modifiee
      return modifiee
    } catch (error) {
      disponibilitesErrorMessage.value = error.message
      throw error
    }
  }

  // Supprime une disponibilité et la retire de la liste.
  async function supprimerDisponibilite(id) {
    disponibilitesErrorMessage.value = ''
    try {
      await rendezVousService.deleteDisponibilite(id)
      disponibilites.value = disponibilites.value.filter((item) => item.id !== id)
    } catch (error) {
      disponibilitesErrorMessage.value = error.message
      throw error
    }
  }

  // Ce que le store met à disposition des pages.
  return {
    rendezVous,
    isLoading,
    errorMessage,
    chargerRendezVous,
    creerRendezVous,
    confirmer,
    refuser,
    annuler,
    terminer,
    disponibilites,
    isLoadingDisponibilites,
    disponibilitesErrorMessage,
    chargerMesDisponibilites,
    creerDisponibilite,
    modifierDisponibilite,
    supprimerDisponibilite,
  }
})
