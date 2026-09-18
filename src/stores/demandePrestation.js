import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as demandeService from '@/services/demandePrestationService'

/** Données de demandes du client connecté, sans identité envoyée par le frontend. */
export const useDemandePrestationStore = defineStore('demandePrestation', () => {
  const demandes = ref([])
  const demandeSelectionnee = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const isLoaded = ref(false)

  async function chargerDemandes(force = false) {
    if (isLoaded.value && !force) return
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await demandeService.listRequests()
      demandes.value = Array.isArray(data) ? data : data?.results || []
      isLoaded.value = true
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function chargerDemande(id) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      demandeSelectionnee.value = await demandeService.getRequest(id)
      return demandeSelectionnee.value
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function creerDemande(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const demande = await demandeService.createRequest(payload)
      demandes.value.unshift(demande)
      return demande
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function annulerDemande(id) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await demandeService.cancelRequest(id)
      const demande = demandes.value.find((item) => item.id === id)
      if (demande) demande.statut = 'ANNULEE'
      if (demandeSelectionnee.value?.id === id) demandeSelectionnee.value.statut = 'ANNULEE'
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function changerStatutPrestataire(id, action) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const updated = await demandeService[action](id)
      const index = demandes.value.findIndex((item) => item.id === id)
      if (index >= 0) demandes.value[index] = updated
      if (demandeSelectionnee.value?.id === id) demandeSelectionnee.value = updated
      return updated
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const accepterDemande = (id) => changerStatutPrestataire(id, 'acceptRequest')
  const refuserDemande = (id) => changerStatutPrestataire(id, 'rejectRequest')
  const terminerDemande = (id) => changerStatutPrestataire(id, 'completeRequest')

  return { demandes, demandeSelectionnee, isLoading, errorMessage, isLoaded, chargerDemandes, chargerDemande, creerDemande, annulerDemande, accepterDemande, refuserDemande, terminerDemande }
})
