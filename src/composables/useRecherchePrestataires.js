// computed : valeur calculée automatiquement ; ref : donnée réactive.
import { computed, ref } from 'vue'
// useRouter : pour changer de page.
import { useRouter } from 'vue-router'

// Composable de géolocalisation et stores utilisés par la recherche.
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
  // On récupère le routeur, les stores et les outils de position.
  const router = useRouter()
  const prestataireStore = usePrestataireStore()
  const catalogueStore = useCatalogueStore()
  const { positionPourRecherche, loading: positionLoading, error: positionError } = useLocation()

  // Le texte tapé dans la barre de recherche.
  const searchService = ref('')
  // Le prestataire sélectionné (surligné sur la carte).
  const selectedPrestataireId = ref(null)
  // true si la dernière recherche était en langage naturel.
  const rechercheNaturelleActive = ref(false)
  // Référence vers le composant carte (pour la centrer sur un prestataire).
  const providersMapRef = ref(null)

  /* Catégories = filtres, jamais une page séparée. */
  const categorieActive = ref('')
  // La liste des boutons de catégories : "Toutes" + chaque catégorie du catalogue.
  const chipsCategories = computed(() => [
    { id: '', nom: 'Toutes' },
    ...catalogueStore.categories.map((categorie) => ({ id: categorie.nom, nom: categorie.nom })),
  ])

  // Clic sur une catégorie : on met à jour le filtre et on relance la recherche.
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
  // true quand le panneau des filtres est ouvert.
  const filtresOuverts = ref(false)

  /* Recherche « Autour de moi » : position du navigateur, activée explicitement. */
  const positionActive = ref(false)
  const latitude = ref(null)
  const longitude = ref(null)
  // 'gps' (position du navigateur) ou 'adresse' (localisation enregistrée du profil).
  const sourcePosition = ref('gps')
  const libellePosition = ref('')

  // La position du client pour la carte (null si "Autour de moi" est désactivé).
  const clientLocation = computed(() =>
    positionActive.value && latitude.value != null && longitude.value != null
      ? { lat: latitude.value, lng: longitude.value }
      : null,
  )

  // Active "Autour de moi" : on récupère la position, puis on relance la recherche.
  async function activerRechercheAutourDeMoi() {
    try {
      const position = await positionPourRecherche()
      latitude.value = position.latitude
      longitude.value = position.longitude
      sourcePosition.value = position.source
      libellePosition.value = position.libelle
      positionActive.value = true
      lancerRecherche()
    } catch {
      // positionError (retourné par useLocation) porte déjà un message clair.
    }
  }

  // Désactive "Autour de moi" et relance la recherche.
  function desactiverRechercheAutourDeMoi() {
    positionActive.value = false
    latitude.value = null
    longitude.value = null
    lancerRecherche()
  }

  // Bouton on/off "Autour de moi".
  function basculerAutourDeMoi() {
    if (positionActive.value) desactiverRechercheAutourDeMoi()
    else activerRechercheAutourDeMoi()
  }

  // Nombre de filtres actifs (pour l'afficher sur le bouton "Filtres").
  const nombreFiltresActifs = computed(
    () => Object.values(filtres.value).filter((valeur) => valeur === true || (typeof valeur === 'string' && valeur.trim())).length,
  )

  // Filtre "vérifiés seulement" (appliqué dans le navigateur, sans nouvel appel).
  const filtreVerifies = ref(false)
  function basculerVerifies() {
    filtreVerifies.value = !filtreVerifies.value
  }

  // Filtre "disponibles seulement" (envoyé au serveur).
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

  // On retire les non vérifiés si le filtre est actif.
  const resultatsAffiches = computed(() => resultats.value.filter((item) => !filtreVerifies.value || item.verifie))
  // Nombre total de résultats et existence d'une page suivante.
  const totalResultats = computed(() => prestataireStore.paginationRecherche.count)
  const peutVoirPlus = computed(() => Boolean(prestataireStore.paginationRecherche.next))

  // Renvoie "s" si le nombre est supérieur à 1 (pour accorder les mots).
  function pluriel(n) {
    return n > 1 ? 's' : ''
  }

  // Construit les paramètres envoyés au serveur pour la recherche classique.
  function parametresRecherche() {
    const params = {
      q: searchService.value,
      categorie: filtres.value.categorie,
      competence: filtres.value.competence,
      ville: filtres.value.ville,
      disponible: filtres.value.disponible ? 'true' : '',
    }

    // Si "Autour de moi" est actif, on ajoute la position et le rayon.
    if (positionActive.value && latitude.value != null && longitude.value != null) {
      params.latitude = latitude.value
      params.longitude = longitude.value
      params.rayon_km = filtres.value.rayon_km
    }

    return params
  }

  // Lance la recherche classique (les erreurs sont déjà gérées par le store).
  function lancerRecherche() {
    rechercheNaturelleActive.value = false
    return prestataireStore.rechercher(parametresRecherche()).catch(() => {})
  }

  /**
   * Une seule barre de recherche, intelligente : un texte saisi passe par
   * /api/recherche/intelligente/ (interprétation service/catégorie/
   * localisation/urgence, voir prestataireStore.rechercherIntelligente) ;
   * un champ vide relance simplement la recherche classique avec les
   * filtres/catégorie déjà actifs. Si l'API ne trouve aucun résultat réel,
   * elle renvoie des suggestions IA (prestataireStore.suggestionsIA),
   * affichées par SuggestionsRecherche.vue, jamais comme des prestataires.
   * Repli automatique sur la recherche classique en cas d'échec.
   */
  function handleSearch({ service }) {
    // On garde le texte tapé.
    searchService.value = service || ''

    // Texte vide : recherche classique.
    if (!searchService.value) {
      lancerRecherche()
      return
    }

    // On envoie la position si "Autour de moi" est actif.
    const position = positionActive.value && latitude.value != null && longitude.value != null
      ? { lat: latitude.value, lng: longitude.value }
      : null

    rechercheNaturelleActive.value = true

    // Si la recherche intelligente échoue, on se rabat sur la recherche classique.
    prestataireStore.rechercherIntelligente(searchService.value, position).catch(() => {
      lancerRecherche()
    })
  }

  // Ferme le panneau des filtres et lance la recherche.
  /** Clic sur une suggestion IA : relance la recherche avec ce libellé réel du catalogue. */
  function rechercherSuggestion(libelle) {
    handleSearch({ service: libelle })
  }

  function appliquerFiltres() {
    filtresOuverts.value = false
    lancerRecherche()
  }

  // Remet tous les filtres à zéro et relance la recherche.
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

  // Charge la page suivante de résultats.
  function voirPlusResultats() {
    prestataireStore.chargerPageSuivante().catch(() => {})
  }

  // Sélectionne un prestataire et centre la carte sur lui.
  function selectPrestataire(id) {
    selectedPrestataireId.value = id
    providersMapRef.value?.centrerSur(id)
  }

  // Ouvre la page de profil d'un prestataire.
  function voirProfil(prestataire) {
    router.push({ name: 'client.prestataire', params: { id: prestataire.id } })
  }

  // Clic sur un marqueur de la carte : on sélectionne et on ouvre le profil.
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
    // On pré-remplit la recherche avec les paramètres de l'URL, s'il y en a.
    if (routeQuery) {
      if (typeof routeQuery.q === 'string' && routeQuery.q) {
        searchService.value = routeQuery.q
      }
      if (typeof routeQuery.categorie === 'string' && routeQuery.categorie) {
        categorieActive.value = routeQuery.categorie
        filtres.value = { ...filtres.value, categorie: routeQuery.categorie }
      }
    }

    // On charge le catalogue et on lance la première recherche en même temps.
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
    sourcePosition,
    libellePosition,
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
    rechercherSuggestion,
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
