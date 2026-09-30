/**
 * Chargement d'une liste admin paginée (utilisateurs, clients,
 * prestataires, demandes, devis, rendez-vous, localisations,
 * signalements) : recherche/filtres, pagination DRF, et les états
 * loading/erreur communs à tous les tableaux du back-office (voir
 * la règle "UX des tableaux" du cahier des charges admin).
 */
import { reactive, ref } from 'vue'

// "fetchFn" = la fonction du service qui charge la liste (ex. listUtilisateurs).
// "filtresInitiaux" = les filtres de départ (ex. { role: '' }).
export function useAdminListe(fetchFn, filtresInitiaux = {}) {
  // Les éléments affichés, le nombre total, la page actuelle et la taille d'une page.
  const items = ref([])
  const count = ref(0)
  const page = ref(1)
  const pageSize = 20
  // L'état de chargement et le message d'erreur.
  const loading = ref(false)
  const errorMessage = ref('')
  // Les filtres de recherche (reactive : l'affichage suit leurs changements).
  const filtres = reactive({ ...filtresInitiaux })

  // Charge la page actuelle avec les filtres actuels.
  async function charger() {
    loading.value = true
    errorMessage.value = ''
    try {
      // On envoie les filtres + le numéro de page au serveur.
      const data = await fetchFn({ ...filtres, page: page.value, page_size: pageSize })
      // On accepte une liste simple ou une réponse paginée.
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

  // Va à une autre page et la charge.
  function changerPage(nouvellePage) {
    page.value = nouvellePage
    return charger()
  }

  // Ce que le composable met à disposition de la page.
  return { items, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage }
}
