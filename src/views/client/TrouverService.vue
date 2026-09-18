<script setup>
/**
 * FindProvider.vue
 * ------------------------------------------------------------------
 * Résultats de recherche de prestataires (service + localisation).
 *
 * Alignée sur le design system "pp-" utilisé par le profil prestataire
 * et le tableau de bord client, pour que les trois écrans se ressemblent
 * devant le jury (mêmes jetons de couleur, même typographie).
 * ------------------------------------------------------------------
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Circle, MapPin, RotateCcw, Search } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import ServiceSearch from '@/components/client/ServiceSearch.vue'
import ServiceCard from '@/components/client/ServiceCard.vue'
import { usePrestataireStore } from '@/stores/prestataire'

const router = useRouter()
const prestataireStore = usePrestataireStore()

/* ---------------------------------------------------------------- *
 * Recherche
 * ---------------------------------------------------------------- */
const searchService = ref('')
const searchLocation = ref('')
const selectedPrestataireId = ref(null)

// Nombre de cartes affichées avant le repli "voir plus".
const PAGE_SIZE = 6
const visibleCount = ref(PAGE_SIZE)

/* ---------------------------------------------------------------- *
 * Prestataires réels venant du backend
 * ---------------------------------------------------------------- */
function photoDe(profile) {
  return profile.photo || profile.profile_photo || profile.avatar || ''
}

const prestataires = computed(() =>
  prestataireStore.prestataires.map((profile) => {
    const services = Array.isArray(profile.services) ? profile.services : []

    return {
      id: profile.id,
      nom: `${profile.user_first_name || ''} ${profile.user_last_name || ''}`.trim() || profile.user_email || 'Prestataire',
      services,
      verifie: profile.statut_verification === 'VERIFIE',
      disponible: Boolean(profile.disponibilite),
      image: photoDe(profile),
      zone: profile.zone || profile.quartier || profile.ville || '',
    }
  }),
)

/* ---------------------------------------------------------------- *
 * Filtres rapides (case à cocher, appliqués en plus de la recherche)
 * ---------------------------------------------------------------- */
const filtreVerifies = ref(false)
const filtreDisponibles = ref(false)

function basculerFiltre(nom) {
  if (nom === 'verifies') filtreVerifies.value = !filtreVerifies.value
  if (nom === 'disponibles') filtreDisponibles.value = !filtreDisponibles.value
  visibleCount.value = PAGE_SIZE
}

/* ---------------------------------------------------------------- *
 * Filtrage
 * ---------------------------------------------------------------- */
const filteredPrestataires = computed(() => {
  const service = searchService.value.toLowerCase().trim()
  const location = searchLocation.value.toLowerCase().trim()

  return prestataires.value.filter((prestataire) => {
    const matchService =
      !service ||
      prestataire.services.some((item) => {
        const nomService = item.nom || item.name || item.service_nom || ''
        return nomService.toLowerCase().includes(service)
      })

    const matchLocation = !location || prestataire.zone.toLowerCase().includes(location)
    const matchVerifie = !filtreVerifies.value || prestataire.verifie
    const matchDisponible = !filtreDisponibles.value || prestataire.disponible

    return matchService && matchLocation && matchVerifie && matchDisponible
  })
})

const prestatairesVisibles = computed(() => filteredPrestataires.value.slice(0, visibleCount.value))
const resteAVoir = computed(() => filteredPrestataires.value.length - prestatairesVisibles.value.length)

// Accord grammatical simple, évalué une fois plutôt que répété dans le template.
const pluriel = (n) => (n > 1 ? 's' : '')

function voirPlus() {
  visibleCount.value += PAGE_SIZE
}

/* ---------------------------------------------------------------- *
 * Actions
 * ---------------------------------------------------------------- */
function handleSearch({ service, location }) {
  searchService.value = service || ''
  searchLocation.value = location || ''
  visibleCount.value = PAGE_SIZE
}

function reinitialiser() {
  searchService.value = ''
  searchLocation.value = ''
  filtreVerifies.value = false
  filtreDisponibles.value = false
  visibleCount.value = PAGE_SIZE
}

function selectPrestataire(id) {
  selectedPrestataireId.value = id
  router.push({ name: 'client.prestataire', params: { id } })
}

/* ---------------------------------------------------------------- *
 * Chargement
 * ---------------------------------------------------------------- */
function chargerDonnees() {
  return prestataireStore.chargerPrestataires().catch(() => {})
}

onMounted(chargerDonnees)
</script>

<template>
  <AppLayout>
    <div class="fp-page">
      <ClientHeader
        title="Trouver un prestataire"
        subtitle="Des professionnels vérifiés sont disponibles près de vous."
      />

      <ServiceSearch
        with-location
        :service="searchService"
        :location="searchLocation"
        @search="handleSearch"
      />

      <div class="fp-layout">
        <!-- ============================================================= -->
        <!-- LISTE -->
        <!-- ============================================================= -->
        <section class="fp-results">
          <!-- En-tête des résultats -->
          <div class="fp-results__head">
            <div>
              <h2 class="fp-display fp-results__count">
                {{ filteredPrestataires.length }} prestataire{{ pluriel(filteredPrestataires.length) }} trouvé{{ pluriel(filteredPrestataires.length) }}
              </h2>
              <p class="fp-results__sub">
                Pour <strong>{{ searchService || 'tous les services' }}</strong>
                <span v-if="searchLocation"> à <strong>{{ searchLocation }}</strong></span>
              </p>
            </div>

            <button
              v-if="searchService || searchLocation || filtreVerifies || filtreDisponibles"
              type="button"
              class="fp-reset"
              @click="reinitialiser"
            >
              <RotateCcw class="fp-icon-xs" :stroke-width="2.25" />
              Réinitialiser
            </button>
          </div>

          <!-- Filtres rapides : à bascule, reflètent leur état actif -->
          <div class="fp-filters" role="group" aria-label="Filtres rapides">
            <button
              type="button"
              class="fp-filter fp-filter--verified"
              :class="{ 'fp-filter--active': filtreVerifies }"
              :aria-pressed="filtreVerifies"
              @click="basculerFiltre('verifies')"
            >
              <CheckCircle2 class="fp-icon-xs" :stroke-width="2.25" />
              Vérifiés
            </button>
            <button
              type="button"
              class="fp-filter fp-filter--available"
              :class="{ 'fp-filter--active': filtreDisponibles }"
              :aria-pressed="filtreDisponibles"
              @click="basculerFiltre('disponibles')"
            >
              <Circle class="fp-icon-xs" :stroke-width="2.25" fill="currentColor" />
              Disponibles
            </button>
          </div>

          <!-- =========================================================== -->
          <!-- CHARGEMENT -->
          <!-- =========================================================== -->
          <div v-if="prestataireStore.isLoading" class="fp-grid" aria-busy="true" aria-live="polite">
            <span class="fp-sr">Chargement des prestataires…</span>
            <div v-for="n in 4" :key="n" class="fp-skel-card">
              <div class="fp-skel fp-skel--avatar"></div>
              <div class="fp-skel-lines">
                <div class="fp-skel fp-skel--line"></div>
                <div class="fp-skel fp-skel--line fp-skel--short"></div>
                <div class="fp-skel fp-skel--pill"></div>
              </div>
            </div>
          </div>

          <!-- =========================================================== -->
          <!-- ERREUR -->
          <!-- =========================================================== -->
          <div v-else-if="prestataireStore.errorMessage" class="fp-state fp-state--error" role="alert">
            <h3 class="fp-display fp-state__title">Impossible de charger les prestataires</h3>
            <p class="fp-state__text">{{ prestataireStore.errorMessage }}</p>
            <button type="button" class="fp-btn" @click="chargerDonnees">
              <RotateCcw class="fp-icon-sm" :stroke-width="2.25" />
              Réessayer
            </button>
          </div>

          <!-- =========================================================== -->
          <!-- AUCUN RÉSULTAT -->
          <!-- =========================================================== -->
          <div v-else-if="filteredPrestataires.length === 0" class="fp-state fp-state--empty">
            <div class="fp-state__icon">
              <Search class="fp-icon-md" :stroke-width="1.75" />
            </div>
            <h3 class="fp-display fp-state__title">Aucun prestataire trouvé</h3>
            <p class="fp-state__text">
              Essayez une autre recherche, une autre localisation, ou retirez un filtre pour élargir les résultats.
            </p>
            <button
              v-if="searchService || searchLocation || filtreVerifies || filtreDisponibles"
              type="button"
              class="fp-btn fp-btn--ghost"
              @click="reinitialiser"
            >
              Réinitialiser la recherche
            </button>
          </div>

          <!-- =========================================================== -->
          <!-- CARTES -->
          <!-- =========================================================== -->
          <template v-else>
            <div class="fp-grid">
              <ServiceCard
                v-for="prestataire in prestatairesVisibles"
                :key="prestataire.id"
                :prestataire="prestataire"
                :selected="selectedPrestataireId === prestataire.id"
                @select="selectPrestataire"
              />
            </div>

            <div v-if="resteAVoir > 0" class="fp-more">
              <button type="button" class="fp-btn fp-btn--ghost" @click="voirPlus">
                Voir {{ Math.min(resteAVoir, PAGE_SIZE) }} prestataire{{ pluriel(resteAVoir) }} de plus
              </button>
              <p class="fp-more__note">{{ resteAVoir }} autre{{ pluriel(resteAVoir) }} disponible{{ pluriel(resteAVoir) }}</p>
            </div>
          </template>
        </section>

        <!-- ============================================================= -->
        <!-- COLONNE DROITE -->
        <!-- ============================================================= -->
        <aside class="fp-aside">
          <div class="fp-aside__card">
            <div class="fp-aside__icon">
              <MapPin class="fp-icon-md" :stroke-width="1.8" />
            </div>

            <h3 class="fp-display fp-aside__title">Prestataires proches</h3>
            <p class="fp-aside__text">
              Les professionnels proches de votre zone apparaîtront ici lorsque la localisation sera activée.
            </p>

            <div class="fp-aside__summary">
              <p class="fp-aside__label">Votre recherche</p>
              <p class="fp-aside__value">{{ searchService || 'Tous les services' }}</p>
              <p v-if="searchLocation" class="fp-aside__meta">
                <MapPin class="fp-icon-xs" :stroke-width="2.25" /> {{ searchLocation }}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/*
 * Mise en page de la recherche de prestataires.
 * Les jetons (--pp-*) viennent de :root, déclarés globalement par la
 * page de profil prestataire ; les valeurs de repli après la virgule
 * garantissent un rendu correct si cette page est ouverte en premier.
 */
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&family=Inter:wght@400;500;600;700&display=swap');

.fp-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--pp-ink, #14261f);
  -webkit-font-smoothing: antialiased;
}

@media (min-width: 1024px) {
  .fp-page { gap: 2.25rem; }
}

.fp-display {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  font-optical-sizing: auto;
  letter-spacing: -0.01em;
}

.fp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.fp-icon-xs { width: 0.8125rem; height: 0.8125rem; }
.fp-icon-sm { width: 1rem; height: 1rem; }
.fp-icon-md { width: 1.375rem; height: 1.375rem; }

/* ------------------------------------------------------------------ *
 * Disposition : liste (large) + colonne latérale (fixe, desktop)
 * ------------------------------------------------------------------ */
.fp-layout {
  display: grid;
  gap: 1.75rem;
}

@media (min-width: 1280px) {
  .fp-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
    gap: 2.25rem;
  }
}

.fp-results { min-width: 0; }

/* En-tête des résultats */
.fp-results__head {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
@media (min-width: 640px) {
  .fp-results__head { flex-direction: row; align-items: center; justify-content: space-between; }
}

.fp-results__count {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pp-ink, #14261f);
}
.fp-results__sub {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--pp-ink-soft, #57655c);
}
.fp-results__sub strong { color: var(--pp-ink, #14261f); font-weight: 600; }

.fp-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: var(--pp-radius-sm, 8px);
  background: var(--pp-surface, #ffffff);
  color: var(--pp-ink-soft, #57655c);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}
.fp-reset:hover { border-color: var(--pp-border-strong, #b7c2ba); color: var(--pp-ink, #14261f); }

/* Filtres rapides : boutons à bascule (état actif visible et cliquable) */
.fp-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }

.fp-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: 999px;
  background: var(--pp-surface, #ffffff);
  color: var(--pp-ink-soft, #57655c);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.fp-filter:hover { border-color: var(--pp-border-strong, #b7c2ba); }

.fp-filter--verified.fp-filter--active {
  background: var(--pp-primary-tint, #eaf3ee);
  border-color: var(--pp-primary, #234b3d);
  color: var(--pp-primary, #234b3d);
}
.fp-filter--available.fp-filter--active {
  background: #edf4ff;
  border-color: #416b9a;
  color: #416b9a;
}

/* ------------------------------------------------------------------ *
 * Grille de cartes
 * ------------------------------------------------------------------ */
.fp-grid {
  display: grid;
  gap: 1rem;
}
@media (min-width: 640px) {
  .fp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.fp-more {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.fp-more__note { margin: 0; font-size: 0.8125rem; color: var(--pp-ink-faint, #8a978f); }

/* ------------------------------------------------------------------ *
 * États : chargement, erreur, vide
 * ------------------------------------------------------------------ */
.fp-skel-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: var(--pp-radius-lg, 16px);
  background: var(--pp-surface, #ffffff);
}
.fp-skel-lines { flex: 1; display: grid; gap: 0.625rem; align-content: center; }

.fp-skel {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--pp-canvas, #f6f8f6) 25%, #eceff0 37%, var(--pp-canvas, #f6f8f6) 63%);
  background-size: 400% 100%;
  animation: fp-shimmer 1.4s ease infinite;
}
.fp-skel--avatar { width: 56px; height: 56px; border-radius: var(--pp-radius-md, 12px); flex-shrink: 0; }
.fp-skel--line { height: 0.75rem; width: 80%; }
.fp-skel--short { width: 45%; }
.fp-skel--pill { height: 1.25rem; width: 40%; border-radius: 999px; margin-top: 0.25rem; }

@keyframes fp-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-skel { animation: none; }
}

.fp-state {
  padding: 2.5rem 1.5rem;
  border-radius: var(--pp-radius-lg, 16px);
  text-align: center;
}
.fp-state--error {
  border: 1px solid var(--pp-danger, #a85148);
  background: var(--pp-danger-tint, #fbeeec);
}
.fp-state--error .fp-state__title,
.fp-state--error .fp-state__text { color: var(--pp-danger, #a85148); }

.fp-state--empty {
  border: 1px dashed var(--pp-border, #dce1db);
  background: var(--pp-surface, #ffffff);
}

.fp-state__icon {
  margin: 0 auto 1rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pp-radius-md, 12px);
  background: var(--pp-primary-tint, #eaf3ee);
  color: var(--pp-primary, #234b3d);
}

.fp-state__title { margin: 0; font-size: 1.0625rem; font-weight: 600; color: var(--pp-ink, #14261f); }
.fp-state__text {
  margin: 0.5rem auto 0;
  max-width: 34rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pp-ink-soft, #57655c);
}

/* ------------------------------------------------------------------ *
 * Boutons
 * ------------------------------------------------------------------ */
.fp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.6875rem 1.125rem;
  border: 1px solid var(--pp-primary, #234b3d);
  border-radius: var(--pp-radius-md, 12px);
  background: var(--pp-primary, #234b3d);
  color: #fff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.12s ease;
}
.fp-btn:hover { background: var(--pp-primary-dark, #16302a); }
.fp-btn:active { transform: translateY(1px); }

.fp-btn--ghost {
  background: var(--pp-surface, #ffffff);
  color: var(--pp-primary, #234b3d);
}
.fp-btn--ghost:hover { background: var(--pp-primary-tint, #eaf3ee); }

/* ------------------------------------------------------------------ *
 * Colonne latérale
 * ------------------------------------------------------------------ */
.fp-aside { display: none; }
@media (min-width: 1280px) {
  .fp-aside { display: block; position: sticky; top: 1.5rem; }
}

.fp-aside__card {
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: var(--pp-radius-lg, 16px);
  background: var(--pp-surface, #ffffff);
  padding: 1.25rem;
  box-shadow: var(--pp-shadow-sm, 0 1px 2px rgba(20, 38, 31, 0.05));
}

.fp-aside__icon {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pp-radius-md, 12px);
  background: var(--pp-primary-tint, #eaf3ee);
  color: var(--pp-primary, #234b3d);
}

.fp-aside__title { margin: 1rem 0 0; font-size: 1rem; font-weight: 600; color: var(--pp-ink, #14261f); }
.fp-aside__text { margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.6; color: var(--pp-ink-soft, #57655c); }

.fp-aside__summary {
  margin-top: 1.25rem;
  padding: 0.875rem;
  border-radius: var(--pp-radius-sm, 8px);
  background: var(--pp-canvas, #f6f8f6);
}
.fp-aside__label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pp-primary, #234b3d);
}
.fp-aside__value { margin: 0.25rem 0 0; font-size: 0.875rem; font-weight: 600; color: var(--pp-ink, #14261f); }
.fp-aside__meta {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--pp-ink-soft, #57655c);
}
</style>