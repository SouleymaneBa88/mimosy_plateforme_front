import { computed, onMounted, ref } from 'vue'
import { defineStore } from 'pinia'
import * as catalogueService from '@/services/catalogueService'

/** Charge une fois le catalogue public, réutilisable entre les pages. */
export const useCatalogueStore = defineStore('catalogue', () => {
  const categories = ref([])
  const services = ref([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const errorMessage = ref('')

  async function chargerCatalogue() {
    if (isLoaded.value) return
    isLoading.value = true
    errorMessage.value = ''
    try {
      const [categoriesData, servicesData] = await Promise.all([
        catalogueService.listCategories(),
        catalogueService.listServices(),
      ])
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
