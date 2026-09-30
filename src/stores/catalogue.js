// Store Pinia du catalogue (catégories et services).
import { computed, onMounted, ref } from 'vue'
import { defineStore } from 'pinia'
import * as catalogueService from '@/services/catalogueService'

/** Charge une fois le catalogue public, réutilisable entre les pages. */
export const useCatalogueStore = defineStore('catalogue', () => {
  // Les catégories, les services et l'état du chargement.
  const categories = ref([])
  const services = ref([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const errorMessage = ref('')

  // Charge le catalogue une seule fois.
  async function chargerCatalogue() {
    // Déjà chargé : inutile de recommencer.
    if (isLoaded.value) return
    isLoading.value = true
    errorMessage.value = ''
    try {
      // On lance les deux requêtes en même temps et on attend les deux réponses.
      const [categoriesData, servicesData] = await Promise.all([
        catalogueService.listCategories(),
        catalogueService.listServices(),
      ])
      // On accepte une liste simple ou une réponse paginée.
      categories.value = Array.isArray(categoriesData) ? categoriesData : categoriesData?.results || []
      services.value = Array.isArray(servicesData) ? servicesData : servicesData?.results || []
      isLoaded.value = true
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return { categories, services, isLoading, isLoaded, errorMessage, chargerCatalogue }
})
