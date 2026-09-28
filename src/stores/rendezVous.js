import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as rendezVousService from '@/services/rendezVousService'

/** Rendez-vous et disponibilités de l'utilisateur connecté (client ou prestataire). */
export const useRendezVousStore = defineStore('rendezVous', () => {
  const rendezVous = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  const disponibilites = ref([])
  const isLoadingDisponibilites = ref(false)
  const disponibilitesErrorMessage = ref('')

  async function chargerRendezVous() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await rendezVousService.listRendezVous()
      rendezVous.value = Array.isArray(data) ? data : data?.results || []
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

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

  async function changerStatut(id, action) {
    isLoading.value = true
    errorMessage.value = ''
    try {
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

  const confirmer = (id) => changerStatut(id, 'confirmRendezVous')
  const refuser = (id) => changerStatut(id, 'refuseRendezVous')
  const annuler = (id) => changerStatut(id, 'cancelRendezVous')
  const terminer = (id) => changerStatut(id, 'completeRendezVous')

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
