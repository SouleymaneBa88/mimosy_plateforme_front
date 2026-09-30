// Store Pinia des prestataires et de la recherche.
import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as catalogueService from '@/services/catalogueService'

/** État des profils prestataires issus du catalogue Django. */
export const usePrestataireStore = defineStore('prestataire', () => {
  // La liste des prestataires, celui affiché en détail, et l'état de chargement.
  const prestataires = ref([])
  const prestataireSelectionne = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  // État de la recherche (GET /api/recherche/), séparé du chargement
  // brut ci-dessus : une recherche a sa propre pagination et peut
  // échouer indépendamment du reste de la page.
  const resultatsRecherche = ref([])
  const paginationRecherche = ref({ count: 0, next: null, previous: null })
  const isSearching = ref(false)
  const searchErrorMessage = ref('')
  const interpretationRecherche = ref(null)
  // Fallback IA (recherche intelligente sans résultat) : des pistes de
  // recherche issues du catalogue réel, jamais des prestataires. Toujours
  // stockées à part de resultatsRecherche pour ne jamais être affichées
  // comme des cartes de prestataires.
  const suggestionsIA = ref(null)

  // Charge la liste de tous les prestataires.
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

  // Charge un prestataire précis (page de profil).
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

  /** Lance une nouvelle recherche : remplace les résultats précédents. */
  async function rechercher(params) {
    isSearching.value = true
    searchErrorMessage.value = ''
    suggestionsIA.value = null
    try {
      const data = await catalogueService.searchOffers(params)
      // On garde les résultats et les infos de pagination (nombre total, page suivante...).
      resultatsRecherche.value = data.results || []
      paginationRecherche.value = {
        count: data.count ?? 0,
        next: data.next ?? null,
        previous: data.previous ?? null,
      }
    } catch (error) {
      searchErrorMessage.value = error.message
      throw error
    } finally {
      isSearching.value = false
    }
  }

  /** Recherche en langage naturel : remplace les résultats, garde l'interprétation pour l'affichage. */
  async function rechercherIntelligente(query, position = null) {
    isSearching.value = true
    searchErrorMessage.value = ''
    suggestionsIA.value = null
    try {
      const data = await catalogueService.searchIntelligente(query, position)
      resultatsRecherche.value = data.results || []
      paginationRecherche.value = {
        count: data.pagination?.count ?? 0,
        next: data.pagination?.next ?? null,
        previous: data.pagination?.previous ?? null,
      }
      // On garde aussi ce que le serveur a compris du texte (pour l'afficher).
      interpretationRecherche.value = data.interpretation || null
      suggestionsIA.value = data.suggestions_ia || null
    } catch (error) {
      searchErrorMessage.value = error.message
      throw error
    } finally {
      isSearching.value = false
    }
  }

  /** Ajoute la page suivante de résultats à la suite de la recherche en cours. */
  async function chargerPageSuivante() {
    // Pas de page suivante : rien à faire.
    if (!paginationRecherche.value.next) return

    isSearching.value = true
    searchErrorMessage.value = ''
    try {
      const data = await catalogueService.fetchSearchPage(paginationRecherche.value.next)
      // On ajoute les nouveaux résultats à la suite des anciens.
      resultatsRecherche.value = [...resultatsRecherche.value, ...(data.results || [])]
      paginationRecherche.value = {
        count: data.count ?? paginationRecherche.value.count,
        next: data.next ?? null,
        previous: data.previous ?? null,
      }
    } catch (error) {
      searchErrorMessage.value = error.message
      throw error
    } finally {
      isSearching.value = false
    }
  }

  // Ce que le store met à disposition des pages.
  return {
    prestataires,
    prestataireSelectionne,
    isLoading,
    errorMessage,
    chargerPrestataires,
    chargerPrestataire,
    resultatsRecherche,
    paginationRecherche,
    isSearching,
    searchErrorMessage,
    interpretationRecherche,
    suggestionsIA,
    rechercher,
    rechercherIntelligente,
    chargerPageSuivante,
  }
})
