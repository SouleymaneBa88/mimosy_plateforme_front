<script setup>
/**
 * HomeClient.vue — Accueil CLIENT.
 * ------------------------------------------------------------------
 * Disposition reprise de front_mimosy/src/views/clients/Accueil.vue :
 * recherche en hero, catégories en filtres (pas une page séparée),
 * prestataires en cartes disposées "en vagues", carte géographique à
 * côté sur desktop. La page "Trouver un service" séparée n'est plus le
 * point d'entrée principal : toute la recherche se fait ici.
 *
 * Toute la logique (recherche classique, recherche en langage naturel,
 * géolocalisation "Autour de moi", filtres avancés, pagination) vient de
 * TrouverService.vue — reprise telle quelle, rien n'est perdu — la seule
 * différence est la disposition visuelle, alignée sur front_mimosy.
 * ------------------------------------------------------------------
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Circle, LocateFixed, MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import ServiceSearch from '@/components/client/ServiceSearch.vue'
import PrestataireCard from '@/components/client/PrestataireCard.vue'
import SearchFilters from '@/components/client/SearchFilters.vue'
import ProvidersMap from '@/components/client/ProvidersMap.vue'
import Modal from '@/components/common/Modal.vue'
import { useLocation } from '@/composables/useLocation'
import { usePrestataireStore } from '@/stores/prestataire'
import { useCatalogueStore } from '@/stores/catalogue'

const route = useRoute()
const router = useRouter()
const prestataireStore = usePrestataireStore()
const catalogueStore = useCatalogueStore()
const { positionPourRecherche, loading: positionLoading, error: positionError } = useLocation()

/* ---------------------------------------------------------------- *
 * Recherche : une seule barre (voir ServiceSearch.vue). Le texte saisi
 * passe par la recherche intelligente MIMOSY (interprétation service /
 * catégorie / localisation / urgence), avec repli automatique sur la
 * recherche classique si l'interprétation échoue ou si le champ est vide.
 * ---------------------------------------------------------------- */
const searchService = ref('')
const selectedPrestataireId = ref(null)
const rechercheNaturelleActive = ref(false)

/* ---------------------------------------------------------------- *
 * Catégories = filtres (voir front_mimosy : chips sous la recherche,
 * pas une page indépendante). "Toutes" + catégories réelles du catalogue.
 * ---------------------------------------------------------------- */
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

/* ---------------------------------------------------------------- *
 * Filtres avancés : catégorie, compétence, ville, disponibilité.
 * ---------------------------------------------------------------- */
const filtres = ref({
  categorie: '',
  competence: '',
  ville: '',
  disponible: false,
  rayon_km: 10,
})
const filtresOuverts = ref(false)

/* ---------------------------------------------------------------- *
 * Recherche « Autour de moi » : position du navigateur, activée
 * explicitement par l'utilisateur.
 * ---------------------------------------------------------------- */
const positionActive = ref(false)
const latitude = ref(null)
const longitude = ref(null)
// 'gps' (position du navigateur) ou 'adresse' (localisation enregistrée du profil).
const sourcePosition = ref('gps')
const libellePosition = ref('')
const providersMapRef = ref(null)

const clientLocation = computed(() =>
  positionActive.value && latitude.value != null && longitude.value != null
    ? { lat: latitude.value, lng: longitude.value }
    : null,
)

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

/* ---------------------------------------------------------------- *
 * Résultats : chaque entrée de l'API est une offre, mise à la forme
 * attendue par PrestataireCard.
 * ---------------------------------------------------------------- */
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

/* ---------------------------------------------------------------- *
 * Actions
 * ---------------------------------------------------------------- */
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

function voirPlus() {
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

/* ---------------------------------------------------------------- *
 * Chargement initial : catalogue (catégories réelles) + première
 * recherche. Si l'accueil est ouvert avec une recherche déjà déterminée
 * (ex. depuis Diagnostic.vue, ?q=...&categorie=...), on la pré-remplit
 * au lieu de charger tous les prestataires puis de forcer l'utilisateur
 * à ressaisir sa recherche.
 * ---------------------------------------------------------------- */
function chargerDonnees() {
  if (typeof route.query.q === 'string' && route.query.q) {
    searchService.value = route.query.q
  }
  if (typeof route.query.categorie === 'string' && route.query.categorie) {
    categorieActive.value = route.query.categorie
    filtres.value = { ...filtres.value, categorie: route.query.categorie }
  }

  return Promise.all([
    catalogueStore.chargerCatalogue().catch(() => {}),
    lancerRecherche(),
  ])
}

onMounted(chargerDonnees)
</script>

<template>
  <ClientLayout>
    <div class="hc-page">
      <ServiceSearch
        title="Trouver un prestataire"
        placeholder="Service, prestataire, quartier… ou décrivez votre besoin"
        :service="searchService"
        @search="handleSearch"
      />

      <!-- Résultat de l'interprétation de la recherche intelligente (même barre que ci-dessus) -->
      <div v-if="rechercheNaturelleActive && prestataireStore.interpretationRecherche" class="hc-nl__comprehension">
        <span class="hc-nl__comprehension-label">Recherche comprise :</span>
        <span v-if="prestataireStore.interpretationRecherche.categorie" class="hc-nl__chip">{{ prestataireStore.interpretationRecherche.categorie }}</span>
        <span v-if="prestataireStore.interpretationRecherche.service" class="hc-nl__chip">{{ prestataireStore.interpretationRecherche.service }}</span>
        <span v-if="prestataireStore.interpretationRecherche.localisation" class="hc-nl__chip">{{ prestataireStore.interpretationRecherche.localisation }}</span>
        <span v-if="prestataireStore.interpretationRecherche.urgence" class="hc-nl__chip hc-nl__chip--urgent">Urgent</span>
      </div>

      <!-- Catégories = filtres (comme dans front_mimosy, pas une page séparée) -->
      <div class="hc-categories">
        <button
          v-for="chip in chipsCategories"
          :key="chip.id"
          type="button"
          class="hc-chip"
          :class="categorieActive === chip.id ? 'hc-chip--active' : ''"
          @click="choisirCategorie(chip.id)"
        >
          {{ chip.nom }}
        </button>

        <span class="hc-categories__sep" aria-hidden="true" />

        <button type="button" class="hc-filter" :class="{ 'hc-filter--active': positionActive }" :disabled="positionLoading" @click="basculerAutourDeMoi">
          <LocateFixed class="hc-icon-xs" :stroke-width="2.25" />
          {{ positionLoading ? 'Localisation…' : 'Autour de moi' }}
        </button>
        <button type="button" class="hc-filter" :class="{ 'hc-filter--active': filtreVerifies }" @click="basculerVerifies">
          <CheckCircle2 class="hc-icon-xs" :stroke-width="2.25" />
          Vérifiés
        </button>
        <button type="button" class="hc-filter" :class="{ 'hc-filter--active': filtres.disponible }" @click="basculerDisponibles">
          <Circle class="hc-icon-xs" :stroke-width="2.25" fill="currentColor" />
          Disponibles
        </button>
        <button type="button" class="hc-filter" :class="{ 'hc-filter--active': nombreFiltresActifs > 0 }" @click="filtresOuverts = true">
          <SlidersHorizontal class="hc-icon-xs" :stroke-width="2.25" />
          Filtres
          <span v-if="nombreFiltresActifs" class="hc-filter__badge">{{ nombreFiltresActifs }}</span>
        </button>
      </div>

      <p v-if="positionActive" class="hc-position-note">
        <LocateFixed class="hc-icon-xs" :stroke-width="2.25" />
        <template v-if="sourcePosition === 'adresse'">
          Position du navigateur indisponible : recherche dans un rayon de {{ filtres.rayon_km }} km autour de votre adresse enregistrée<span v-if="libellePosition"> ({{ libellePosition }})</span>.
        </template>
        <template v-else>Recherche dans un rayon de {{ filtres.rayon_km }} km autour de votre position.</template>
      </p>
      <p v-else-if="positionError" class="hc-position-note hc-position-note--error" role="alert">{{ positionError }}</p>

      <!-- En-tête résultats -->
      <div class="hc-results__head">
        <div>
          <h2 class="font-serif hc-results__count">
            {{ totalResultats }} prestataire{{ pluriel(totalResultats) }} trouvé{{ pluriel(totalResultats) }}
          </h2>
          <p class="hc-results__sub">
            <MapPin class="hc-icon-xs" :stroke-width="1.8" />
            {{ filtres.ville || (positionActive ? (sourcePosition === 'adresse' ? 'Autour de votre adresse enregistrée' : 'Autour de votre position') : 'Toutes les zones') }}
          </p>
        </div>
        <button
          v-if="searchService || nombreFiltresActifs || filtreVerifies || positionActive"
          type="button"
          class="hc-reset"
          @click="reinitialiser"
        >
          <RotateCcw class="hc-icon-xs" :stroke-width="2.25" />
          Réinitialiser
        </button>
      </div>

      <!-- Prestataires + carte -->
      <div class="hc-layout">
        <section class="hc-results">
          <!-- Chargement -->
          <div v-if="prestataireStore.isSearching && resultatsAffiches.length === 0" class="hc-grid" aria-busy="true" aria-live="polite">
            <div v-for="n in 4" :key="n" class="hc-skel-card">
              <div class="hc-skel hc-skel--photo"></div>
              <div class="hc-skel-lines">
                <div class="hc-skel hc-skel--line"></div>
                <div class="hc-skel hc-skel--line hc-skel--short"></div>
              </div>
            </div>
          </div>

          <!-- Erreur -->
          <div v-else-if="prestataireStore.searchErrorMessage" class="hc-state hc-state--error" role="alert">
            <h3 class="font-serif hc-state__title">Impossible de charger les prestataires</h3>
            <p class="hc-state__text">{{ prestataireStore.searchErrorMessage }}</p>
            <button type="button" class="hc-btn" @click="lancerRecherche">
              <RotateCcw class="hc-icon-sm" :stroke-width="2.25" />
              Réessayer
            </button>
          </div>

          <!-- Vide -->
          <div v-else-if="resultatsAffiches.length === 0" class="hc-state hc-state--empty">
            <div class="hc-state__icon"><Search class="hc-icon-md" :stroke-width="1.75" /></div>
            <h3 class="font-serif hc-state__title">Aucun prestataire trouvé</h3>
            <p class="hc-state__text">
              {{ positionActive ? `Aucun prestataire trouvé dans ce rayon de ${filtres.rayon_km} km. Essayez un rayon plus large.` : 'Essayez avec un autre service, une autre catégorie ou une autre zone.' }}
            </p>
            <button
              v-if="searchService || nombreFiltresActifs || filtreVerifies || positionActive"
              type="button"
              class="hc-btn hc-btn--ghost"
              @click="reinitialiser"
            >
              Réinitialiser la recherche
            </button>
          </div>

          <!-- Cartes, disposition "en vagues" (reprise de front_mimosy/Accueil.vue) -->
          <template v-else>
            <div class="hc-grid">
              <PrestataireCard
                v-for="(prestataire, index) in resultatsAffiches"
                :key="prestataire.offreId"
                :prestataire="prestataire"
                class="hc-card-anim"
                :class="index % 2 === 1 ? 'hc-card--decalee' : ''"
                @view-profile="voirProfil"
              />
            </div>

            <div v-if="peutVoirPlus" class="hc-more">
              <button type="button" class="hc-btn hc-btn--ghost" :disabled="prestataireStore.isSearching" @click="voirPlus">
                {{ prestataireStore.isSearching ? 'Chargement…' : 'Voir plus de prestataires' }}
              </button>
              <p class="hc-more__note">{{ totalResultats }} résultat{{ pluriel(totalResultats) }} au total</p>
            </div>
          </template>
        </section>

        <!-- Carte géographique : toujours visible, comme dans front_mimosy — la vraie carte ProvidersMap, pas une version simplifiée -->
        <aside class="hc-map">
          <ProvidersMap
            ref="providersMapRef"
            :client-location="clientLocation"
            :client-label="sourcePosition === 'adresse' ? 'Votre adresse enregistrée' : 'Votre position'"
            :providers="resultatsAffiches"
            :rayon-km="positionActive ? filtres.rayon_km : null"
            class="h-full"
            @view-profile="surClicMarqueur"
          />
          <div class="hc-map__badge">
            <p class="hc-map__count">{{ resultatsAffiches.length }} prestataire{{ pluriel(resultatsAffiches.length) }}</p>
            <p v-if="positionActive" class="hc-map__radius">rayon de {{ filtres.rayon_km }} km</p>
          </div>
        </aside>
      </div>
    </div>

    <!-- Panneau de filtres avancés (fonctionnalité MIMOSY réelle) -->
    <Modal v-model="filtresOuverts" title="Filtres de recherche">
      <SearchFilters
        v-model="filtres"
        :categories="catalogueStore.categories"
        :position-active="positionActive"
        @apply="appliquerFiltres"
        @reset="reinitialiser"
      />
    </Modal>
  </ClientLayout>
</template>

<style scoped>
/* Conteneur "large" (grille commune CLIENT, voir ClientLayout.vue) : pas de
   max-width, Accueil a besoin de toute la largeur pour cartes + carte géo. */
.hc-page {
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
@media (min-width: 640px) {
  .hc-page { padding: 3rem 2rem; gap: 2rem; }
}

.hc-icon-xs { width: 0.8125rem; height: 0.8125rem; }
.hc-icon-sm { width: 1rem; height: 1rem; }
.hc-icon-md { width: 1.375rem; height: 1.375rem; }

/* Résultat de l'interprétation de la recherche intelligente */
.hc-nl__comprehension { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.75rem; }
.hc-nl__comprehension-label { color: var(--color-mimosy-secondary); font-weight: 600; }
.hc-nl__chip { padding: 0.25rem 0.625rem; border-radius: 999px; background: var(--color-mimosy-primaryBg); color: var(--color-mimosy-primary); font-weight: 600; }
.hc-nl__chip--urgent { background: #fff0ee; color: #a85148; }

/* Catégories / filtres rapides */
.hc-categories { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.hc-chip {
  border-radius: 999px;
  padding: 0.5rem 1.25rem;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--color-mimosy-border);
  background: var(--color-mimosy-surface);
  color: var(--color-mimosy-secondary);
  transition: all 0.18s ease;
}
.hc-chip:hover:not(.hc-chip--active) { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }
.hc-chip--active { background: var(--color-mimosy-text); border-color: var(--color-mimosy-text); color: #fff; }
.hc-categories__sep { width: 1px; height: 1.5rem; background: var(--color-mimosy-border); margin: 0 0.25rem; }

.hc-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--color-mimosy-border);
  border-radius: 999px;
  background: var(--color-mimosy-surface);
  color: var(--color-mimosy-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}
.hc-filter:hover:not(:disabled):not(.hc-filter--active) { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }
.hc-filter:disabled { opacity: 0.6; cursor: default; }
.hc-filter--active { background: var(--color-mimosy-primaryBg); border-color: var(--color-mimosy-primary); color: var(--color-mimosy-primary); }
.hc-filter__badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.125rem; height: 1.125rem; padding: 0 0.25rem;
  border-radius: 999px; background: var(--color-mimosy-primary); color: #fff;
  font-size: 0.625rem; font-weight: 700;
}

.hc-position-note { display: flex; align-items: center; gap: 0.375rem; margin-top: -1rem; font-size: 0.8125rem; color: var(--color-mimosy-primary); }
.hc-position-note--error { color: #a85148; }

/* En-tête résultats */
.hc-results__head { display: flex; flex-direction: column; gap: 0.75rem; }
@media (min-width: 640px) { .hc-results__head { flex-direction: row; align-items: center; justify-content: space-between; } }
.hc-results__count { margin: 0; font-size: 1.5rem; font-weight: 400; color: var(--color-mimosy-text); }
.hc-results__sub { display: flex; align-items: center; gap: 0.375rem; margin: 0.25rem 0 0; font-family: var(--font-sans); font-size: 0.875rem; color: var(--color-mimosy-secondary); }
.hc-reset {
  display: inline-flex; align-items: center; gap: 0.375rem; flex-shrink: 0;
  padding: 0.5rem 0.75rem; border: 1px solid var(--color-mimosy-border); border-radius: 8px;
  background: var(--color-mimosy-surface); color: var(--color-mimosy-secondary);
  font-family: var(--font-sans); font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}
.hc-reset:hover { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }

/* Disposition : prestataires + carte */
.hc-layout { display: grid; gap: 1.5rem; }
@media (min-width: 1280px) {
  .hc-layout { grid-template-columns: minmax(0, 1fr) 380px; align-items: start; gap: 2rem; }
}

.hc-results { min-width: 0; }

/* Grille en "vagues" : cartes paires décalées vers le bas, comme dans front_mimosy/Accueil.vue */
.hc-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
@media (min-width: 640px) { .hc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.hc-card--decalee { transition: transform 0.2s; }
@media (min-width: 640px) {
  .hc-card--decalee { margin-top: 3rem; }
}

.hc-more { margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.hc-more__note { margin: 0; font-size: 0.8125rem; color: var(--color-mimosy-secondary); }

/* États */
.hc-skel-card { display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; border: 1px solid var(--color-mimosy-border); background: var(--color-mimosy-surface); }
.hc-skel-lines { display: grid; gap: 0.625rem; padding: 1.25rem; }
.hc-skel { border-radius: 6px; background: linear-gradient(90deg, var(--color-mimosy-page) 25%, #eceff0 37%, var(--color-mimosy-page) 63%); background-size: 400% 100%; animation: hc-shimmer 1.4s ease infinite; }
.hc-skel--photo { height: 200px; border-radius: 0; }
.hc-skel--line { height: 0.75rem; width: 80%; }
.hc-skel--short { width: 45%; }
@keyframes hc-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .hc-skel { animation: none; } }

.hc-state { padding: 2.5rem 1.5rem; border-radius: 24px; text-align: center; }
.hc-state--error { border: 1px solid #a85148; background: #fbeeec; }
.hc-state--error .hc-state__title, .hc-state--error .hc-state__text { color: #a85148; }
.hc-state--empty { border: 1px dashed var(--color-mimosy-border); background: var(--color-mimosy-surface); }
.hc-state__icon { margin: 0 auto 1rem; width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--color-mimosy-primaryBg); color: var(--color-mimosy-primary); }
.hc-state__title { margin: 0; font-size: 1.0625rem; font-weight: 400; color: var(--color-mimosy-text); }
.hc-state__text { margin: 0.5rem auto 0; max-width: 34rem; font-family: var(--font-sans); font-size: 0.875rem; line-height: 1.6; color: var(--color-mimosy-secondary); }

.hc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  margin-top: 1.25rem; padding: 0.6875rem 1.125rem; border: 1px solid var(--color-mimosy-primary);
  border-radius: 12px; background: var(--color-mimosy-primary); color: #fff;
  font-family: var(--font-sans); font-size: 0.875rem; font-weight: 600; cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}
.hc-btn:hover:not(:disabled) { opacity: 0.9; }
.hc-btn:disabled { opacity: 0.6; cursor: default; }
.hc-btn--ghost { background: var(--color-mimosy-surface); color: var(--color-mimosy-primary); }
.hc-btn--ghost:hover:not(:disabled) { background: var(--color-mimosy-primaryBg); opacity: 1; }

/* Carte géographique */
.hc-map { position: relative; height: 320px; border-radius: 24px; overflow: hidden; border: 1px solid var(--color-mimosy-border); }
@media (min-width: 640px) { .hc-map { height: 420px; } }
@media (min-width: 1280px) { .hc-map { height: 100%; min-height: 560px; position: sticky; top: 1.5rem; } }
.hc-map__badge {
  position: absolute; bottom: 0.75rem; left: 0.75rem; z-index: 1000;
  padding: 0.5rem 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.92); pointer-events: none;
}
.hc-map__count { margin: 0; font-size: 0.75rem; font-weight: 700; color: var(--color-mimosy-text); }
.hc-map__radius { margin: 0.125rem 0 0; font-size: 0.6875rem; color: var(--color-mimosy-secondary); }
</style>
