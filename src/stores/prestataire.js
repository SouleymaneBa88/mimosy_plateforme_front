import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as catalogueService from '@/services/catalogueService'

/** État des profils prestataires issus du catalogue Django. */
export const usePrestataireStore = defineStore('prestataire', () => {
  const prestataires = ref([])
  const prestataireSelectionne = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  async function chargerPrestataires() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      const data = await catalogueService.listProviders()
      prestataires.value = Array.isArray(data) ? data : data?.results || []
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function chargerPrestataire(id) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      prestataireSelectionne.value = await catalogueService.getProvider(id)
      return prestataireSelectionne.value
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return { prestataires, prestataireSelectionne, isLoading, errorMessage, chargerPrestataires, chargerPrestataire }
})
