// Store Pinia des demandes de prestation (données partagées entre les pages).
// ref : donnée réactive ; defineStore : création du store.
import { ref } from 'vue'
import { defineStore } from 'pinia'
// Les fonctions qui appellent l'API des demandes.
import * as demandeService from '@/services/demandePrestationService'

/** Données de demandes du client connecté, sans identité envoyée par le frontend. */
export const useDemandePrestationStore = defineStore('demandePrestation', () => {
  // La liste des demandes, celle affichée en détail, et l'état de chargement.
  const demandes = ref([])
  const demandeSelectionnee = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  // true quand la liste a déjà été chargée une fois (évite de recharger pour rien).
  const isLoaded = ref(false)

  // Charge la liste des demandes. force=true oblige à recharger.
  async function chargerDemandes(force = false) {
    // Déjà chargée et pas de rechargement forcé : on ne fait rien.
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

  // Charge une seule demande (pour la page de détail).
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

  // Crée une demande et l'ajoute en haut de la liste.
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

  // Annule une demande, puis met son statut à jour dans l'affichage.
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

  // Fonction commune pour les actions qui changent le statut d'une demande.
  // "action" est le nom de la fonction du service à appeler.
  async function changerStatutPrestataire(id, action) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      // On appelle le serveur, puis on remplace la demande dans la liste et dans le détail.
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

  // Les actions du prestataire (accepter, refuser, terminer).
  const accepterDemande = (id) => changerStatutPrestataire(id, 'acceptRequest')
  const refuserDemande = (id) => changerStatutPrestataire(id, 'rejectRequest')
  const terminerDemande = (id) => changerStatutPrestataire(id, 'completeRequest')
  // Validation par le client d'une prestation réalisée : libère les fonds côté backend.
  const confirmerDemande = (id) => changerStatutPrestataire(id, 'confirmRequest')

  // Ce que le store met à disposition des pages.
  return { demandes, demandeSelectionnee, isLoading, errorMessage, isLoaded, chargerDemandes, chargerDemande, creerDemande, annulerDemande, accepterDemande, refuserDemande, terminerDemande, confirmerDemande }
})
