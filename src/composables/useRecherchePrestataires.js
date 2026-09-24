import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useLocation } from '@/composables/useLocation'
import { usePrestataireStore } from '@/stores/prestataire'
import { useCatalogueStore } from '@/stores/catalogue'

/**
 * Moteur de recherche de prestataires MIMOSY, partagé entre HomeClient.vue
 * (aperçu "Prestataires proches de vous") et Prestataires.vue (liste
 * complète) : une seule et même logique, jamais deux moteurs concurrents
 * (recherche classique + recherche intelligente + géolocalisation +
 * filtres avancés + pagination), conformément à la consigne produit.
 *
 * `routeQuery` (optionnel) : objet route.query à lire une fois au montage
 * pour pré-remplir la recherche (ex. arrivée depuis Diagnostic.vue avec
 * ?q=...&categorie=...).
 */
export function useRecherchePrestataires() {
  const router = useRouter()
  const prestataireStore = usePrestataireStore()
  const catalogueStore = useCatalogueStore()
  const { requestLocation, loading: positionLoading, error: positionError } = useLocation()

  const searchService = ref('')
  const selectedPrestataireId = ref(null)
  const rechercheNaturelleActive = ref(false)
  const providersMapRef = ref(null)

  /* Catégories = filtres, jamais une page séparée. */
  const categorieActive = ref('')
  const chipsCategories = computed(() => [
    { id: '', nom: 'Toutes' },
    ...catalogueStore.categories.map((categorie) => ({ id: categorie.nom, nom: categorie.nom })),
  ])

  function choisirCategorie(id) {
    categorieActive.value = id
    filtres.value = { ...filtres.value, categorie: id }
    lancerRecherche()
  }

  /* Filtres avancés : catégorie, compétence, ville, disponibilité. */
  const filtres = ref({
    categorie: '',
    competence: '',
    ville: '',
    disponible: false,
    rayon_km: 10,
  })
  const filtresOuverts = ref(false)

  /* Recherche « Autour de moi » : position du navigateur, activée explicitement. */
  const positionActive = ref(false)
  const latitude = ref(null)
  const longitude = ref(null)

  const clientLocation = computed(() =>
    positionActive.value && latitude.value != null && longitude.value != null
      ? { lat: latitude.value, lng: longitude.value }
      : null,
  )

  async function activerRechercheAutourDeMoi() {
    try {
      const position = await requestLocation()
      latitude.value = position.latitude
      longitude.value = position.longitude
      positionActive.value = true
      lancerRecherche()
    } catch {
      // positionError (retourné par useLocation) porte déjà un message clair.
    }
  }

  function desactiverRechercheAutourDeMoi() {
    positionActive.value = false
    latitude.value = null
    longitude.value = null
    lancerRecherche()
  }

  function basculerAutourDeMoi() {
    if (positionActive.value) desactiverRechercheAutourDeMoi()
    else activerRechercheAutourDeMoi()
  }

  const nombreFiltresActifs = computed(
    () => Object.values(filtres.value).filter((valeur) => valeur === true || (typeof valeur === 'string' && valeur.trim())).length,
  )

  const filtreVerifies = ref(false)
  function basculerVerifies() {
    filtreVerifies.value = !filtreVerifies.value
  }

  function basculerDisponibles() {
    filtres.value = { ...filtres.value, disponible: !filtres.value.disponible }
    lancerRecherche()
  }

  /* Résultats : chaque entrée de l'API est une offre, mise à la forme attendue par PrestataireCard. */
  const resultats = computed(() =>
    prestataireStore.resultatsRecherche.map((item) => ({
      id: item.prestataire_id,
      offreId: item.id,
      nom: item.prestataire_nom || 'Prestataire',
      image: item.prestataire_photo || '',
      service: item.service_nom,
      entreprise: item.categorie_nom,
      verifie: item.statut_verification === 'VERIFIE',
      note: null,
      avis: null,
      zone: undefined,
      // Distance réelle uniquement si l'API la fournit (recherche « Autour de
      // moi » active) : jamais une distance inventée quand elle est absente.
      distance: item.distance_km ?? null,
      disponible: item.disponible,
      prix: item.prix != null ? Number(item.prix) : null,
      latitude: item.latitude != null ? Number(item.latitude) : null,
      longitude: item.longitude != null ? Number(item.longitude) : null,
    })),
  )

  const resultatsAffiches = computed(() => resultats.value.filter((item) => !filtreVerifies.value || item.verifie))
  const totalResultats = computed(() => prestataireStore.paginationRecherche.count)
  const peutVoirPlus = computed(() => Boolean(prestataireStore.paginationRecherche.next))

  function pluriel(n) {
    return n > 1 ? 's' : ''
  }

  function parametresRecherche() {
    const params = {
      q: searchService.value,
      categorie: filtres.value.categorie,
      competence: filtres.value.competence,
      ville: filtres.value.ville,
      disponible: filtres.value.disponible ? 'true' : '',
    }

    if (positionActive.value && latitude.value != null && longitude.value != null) {
      params.latitude = latitude.value
      params.longitude = longitude.value
      params.rayon_km = filtres.value.rayon_km
    }

    return params
  }

  function lancerRecherche() {
    rechercheNaturelleActive.value = false
    return prestataireStore.rechercher(parametresRecherche()).catch(() => {})
  }

  /**
   * Une seule barre de recherche, intelligente : un texte saisi passe par
   * /api/recherche/intelligente/ (interprétation service/catégorie/
   * localisation/urgence, voir prestataireStore.rechercherIntelligente) ;
   * un champ vide relance simplement la recherche classique avec les
   * filtres/catégorie déjà actifs. Aucun faux système IA : c'est le vrai
   * endpoint MIMOSY, avec repli automatique sur la recherche classique en
   * cas d'échec.
   */
  function handleSearch({ service }) {
    searchService.value = service || ''

    if (!searchService.value) {
      lancerRecherche()
      return
    }

    const position = positionActive.value && latitude.value != null && longitude.value != null
      ? { lat: latitude.value, lng: longitude.value }
      : null

    rechercheNaturelleActive.value = true

    prestataireStore.rechercherIntelligente(searchService.value, position).catch(() => {
      lancerRecherche()
    })
  }

  function appliquerFiltres() {
    filtresOuverts.value = false
    lancerRecherche()
  }

  function reinitialiser() {
    searchService.value = ''
    rechercheNaturelleActive.value = false
    categorieActive.value = ''
    filtres.value = { categorie: '', competence: '', ville: '', disponible: false, rayon_km: 10 }
    filtreVerifies.value = false
    filtresOuverts.value = false
    positionActive.value = false
    latitude.value = null
    longitude.value = null
    lancerRecherche()
  }

  function voirPlusResultats() {
    prestataireStore.chargerPageSuivante().catch(() => {})
  }

  function selectPrestataire(id) {
    selectedPrestataireId.value = id
    providersMapRef.value?.centrerSur(id)
  }

  function voirProfil(prestataire) {
    router.push({ name: 'client.prestataire', params: { id: prestataire.id } })
  }

  function surClicMarqueur(provider) {
    selectedPrestataireId.value = provider.id
    voirProfil(provider)
  }

  /**
   * Charge le catalogue (catégories réelles) + une première recherche.
   * `routeQuery` : si fourni avec q/categorie (ex. arrivée depuis
   * Diagnostic.vue), pré-remplit la recherche avant de la lancer.
   */
  function chargerDonnees(routeQuery) {
    if (routeQuery) {
      if (typeof routeQuery.q === 'string' && routeQuery.q) {
        searchService.value = routeQuery.q
      }
      if (typeof routeQuery.categorie === 'string' && routeQuery.categorie) {
        categorieActive.value = routeQuery.categorie
        filtres.value = { ...filtres.value, categorie: routeQuery.categorie }
      }
    }

    return Promise.all([
      catalogueStore.chargerCatalogue().catch(() => {}),
      lancerRecherche(),
    ])
  }

  return {
    // état
    searchService,
    selectedPrestataireId,
    rechercheNaturelleActive,
    providersMapRef,
    categorieActive,
    chipsCategories,
    filtres,
    filtresOuverts,
    positionActive,
    positionLoading,
    positionError,
    clientLocation,
    nombreFiltresActifs,
    filtreVerifies,
    resultatsAffiches,
    totalResultats,
    peutVoirPlus,
    catalogueStore,
    prestataireStore,
    // actions
    choisirCategorie,
    basculerAutourDeMoi,
    basculerVerifies,
    basculerDisponibles,
    lancerRecherche,
    handleSearch,
    appliquerFiltres,
    reinitialiser,
    voirPlusResultats,
    selectPrestataire,
    voirProfil,
    surClicMarqueur,
    chargerDonnees,
    pluriel,
  }
}
