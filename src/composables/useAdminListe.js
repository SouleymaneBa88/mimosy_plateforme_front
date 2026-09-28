/**
 * Chargement d'une liste admin paginée (utilisateurs, clients,
 * prestataires, demandes, devis, rendez-vous, localisations,
 * signalements) : recherche/filtres, pagination DRF, et les états
 * loading/erreur communs à tous les tableaux du back-office (voir
 * la règle "UX des tableaux" du cahier des charges admin).
 */
import { reactive, ref } from 'vue'

export function useAdminListe(fetchFn, filtresInitiaux = {}) {
  const items = ref([])
  const count = ref(0)
  const page = ref(1)
  const pageSize = 20
  const loading = ref(false)
  const errorMessage = ref('')
  const filtres = reactive({ ...filtresInitiaux })

  async function charger() {
    loading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchFn({ ...filtres, page: page.value, page_size: pageSize })
      items.value = Array.isArray(data) ? data : data?.results || []
      count.value = Array.isArray(data) ? items.value.length : (data?.count ?? items.value.length)
    } catch (error) {
      errorMessage.value = error.message
    } finally {
      loading.value = false
    }
  }

  // À utiliser quand un filtre change : on revient à la première page,
  // sinon une page 3 filtrée pourrait n'avoir aucun résultat.
  function rechercher() {
    page.value = 1
    return charger()
  }

  function changerPage(nouvellePage) {
    page.value = nouvellePage
    return charger()
  }

  return { items, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage }
}
