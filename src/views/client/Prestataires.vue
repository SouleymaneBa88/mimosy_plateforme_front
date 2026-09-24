<script setup>
/**
 * Prestataires.vue — Liste complète des prestataires.
 * ------------------------------------------------------------------
 * Accessible depuis l'accueil via "Voir plus" (section "Prestataires
 * proches de vous"). Remplace fonctionnellement l'ancien
 * TrouverService.vue : même moteur de recherche que l'accueil (voir
 * composables/useRecherchePrestataires.js), pas un second système
 * concurrent. Mêmes règles visuelles que le reste du CLIENT (conteneur,
 * cartes, filtres) pour que la page se ressente comme une extension
 * directe de l'accueil.
 * ------------------------------------------------------------------
 */
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { CheckCircle2, Circle, LocateFixed, MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import ServiceSearch from '@/components/client/ServiceSearch.vue'
import PrestataireCard from '@/components/client/PrestataireCard.vue'
import SearchFilters from '@/components/client/SearchFilters.vue'
import ProvidersMap from '@/components/client/ProvidersMap.vue'
import Modal from '@/components/common/Modal.vue'
import { useRecherchePrestataires } from '@/composables/useRecherchePrestataires'

const route = useRoute()

const {
  searchService,
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
  choisirCategorie,
  basculerAutourDeMoi,
  basculerVerifies,
  basculerDisponibles,
  lancerRecherche,
  handleSearch,
  appliquerFiltres,
  reinitialiser,
  voirPlusResultats,
  voirProfil,
  surClicMarqueur,
  chargerDonnees,
  pluriel,
} = useRecherchePrestataires()

onMounted(() => chargerDonnees(route.query))
</script>

<template>
  <ClientLayout>
    <div class="pr-page">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Prestataires</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Parcourez tous les professionnels disponibles sur MIMOSY.</p>
      </div>

      <ServiceSearch
        title="Trouver un prestataire"
        placeholder="Service, prestataire, quartier… ou décrivez votre besoin"
        :service="searchService"
        @search="handleSearch"
      />

      <div v-if="rechercheNaturelleActive && prestataireStore.interpretationRecherche" class="pr-nl__comprehension">
        <span class="pr-nl__comprehension-label">Recherche comprise :</span>
        <span v-if="prestataireStore.interpretationRecherche.categorie" class="pr-nl__chip">{{ prestataireStore.interpretationRecherche.categorie }}</span>
        <span v-if="prestataireStore.interpretationRecherche.service" class="pr-nl__chip">{{ prestataireStore.interpretationRecherche.service }}</span>
        <span v-if="prestataireStore.interpretationRecherche.localisation" class="pr-nl__chip">{{ prestataireStore.interpretationRecherche.localisation }}</span>
        <span v-if="prestataireStore.interpretationRecherche.urgence" class="pr-nl__chip pr-nl__chip--urgent">Urgent</span>
      </div>

      <!-- Filtres, même langage visuel que MesDemandes.vue -->
      <div class="pr-categories">
        <button
          v-for="chip in chipsCategories"
          :key="chip.id"
          type="button"
          class="pr-chip"
          :class="categorieActive === chip.id ? 'pr-chip--active' : ''"
          @click="choisirCategorie(chip.id)"
        >
          {{ chip.nom }}
        </button>

        <span class="pr-categories__sep" aria-hidden="true" />

        <button type="button" class="pr-filter" :class="{ 'pr-filter--active': positionActive }" :disabled="positionLoading" @click="basculerAutourDeMoi">
          <LocateFixed class="pr-icon-xs" :stroke-width="2.25" />
          {{ positionLoading ? 'Localisation…' : 'Autour de moi' }}
        </button>
        <button type="button" class="pr-filter" :class="{ 'pr-filter--active': filtreVerifies }" @click="basculerVerifies">
          <CheckCircle2 class="pr-icon-xs" :stroke-width="2.25" />
          Vérifiés
        </button>
        <button type="button" class="pr-filter" :class="{ 'pr-filter--active': filtres.disponible }" @click="basculerDisponibles">
          <Circle class="pr-icon-xs" :stroke-width="2.25" fill="currentColor" />
          Disponibles
        </button>
        <button type="button" class="pr-filter" :class="{ 'pr-filter--active': nombreFiltresActifs > 0 }" @click="filtresOuverts = true">
          <SlidersHorizontal class="pr-icon-xs" :stroke-width="2.25" />
          Filtres
          <span v-if="nombreFiltresActifs" class="pr-filter__badge">{{ nombreFiltresActifs }}</span>
        </button>
      </div>

      <p v-if="positionActive" class="pr-position-note">
        <LocateFixed class="pr-icon-xs" :stroke-width="2.25" />
        Recherche dans un rayon de {{ filtres.rayon_km }} km autour de votre position.
      </p>
      <p v-else-if="positionError" class="pr-position-note pr-position-note--error" role="alert">{{ positionError }}</p>

      <!-- En-tête résultats -->
      <div class="pr-results__head">
        <div>
          <h2 class="font-serif pr-results__count">
            {{ totalResultats }} prestataire{{ pluriel(totalResultats) }} trouvé{{ pluriel(totalResultats) }}
          </h2>
          <p class="pr-results__sub">
            <MapPin class="pr-icon-xs" :stroke-width="1.8" />
            {{ filtres.ville || (positionActive ? 'Autour de vous' : 'Prestataires disponibles') }}
          </p>
        </div>
        <button v-if="searchService || nombreFiltresActifs || filtreVerifies || positionActive" type="button" class="pr-reset" @click="reinitialiser">
          <RotateCcw class="pr-icon-xs" :stroke-width="2.25" />
          Réinitialiser
        </button>
      </div>

      <!-- Prestataires + carte -->
      <div class="pr-layout">
        <section class="pr-results">
          <div v-if="prestataireStore.isSearching && resultatsAffiches.length === 0" class="pr-grid" aria-busy="true" aria-live="polite">
            <div v-for="n in 6" :key="n" class="pr-skel-card">
              <div class="pr-skel pr-skel--photo"></div>
              <div class="pr-skel-lines">
                <div class="pr-skel pr-skel--line"></div>
                <div class="pr-skel pr-skel--line pr-skel--short"></div>
              </div>
            </div>
          </div>

          <div v-else-if="prestataireStore.searchErrorMessage" class="pr-state pr-state--error" role="alert">
            <h3 class="font-serif pr-state__title">Impossible de charger les prestataires</h3>
            <p class="pr-state__text">{{ prestataireStore.searchErrorMessage }}</p>
            <button type="button" class="pr-btn" @click="lancerRecherche">
              <RotateCcw class="pr-icon-sm" :stroke-width="2.25" />
              Réessayer
            </button>
          </div>

          <div v-else-if="resultatsAffiches.length === 0" class="pr-state pr-state--empty">
            <div class="pr-state__icon"><Search class="pr-icon-md" :stroke-width="1.75" /></div>
            <h3 class="font-serif pr-state__title">Aucun prestataire trouvé</h3>
            <p class="pr-state__text">
              {{ positionActive ? `Aucun prestataire trouvé dans ce rayon de ${filtres.rayon_km} km. Essayez un rayon plus large.` : 'Essayez avec un autre service, une autre catégorie ou une autre zone.' }}
            </p>
            <button v-if="searchService || nombreFiltresActifs || filtreVerifies || positionActive" type="button" class="pr-btn pr-btn--ghost" @click="reinitialiser">
              Réinitialiser la recherche
            </button>
          </div>

          <template v-else>
            <div class="pr-grid">
              <PrestataireCard
                v-for="(prestataire, index) in resultatsAffiches"
                :key="prestataire.offreId"
                :prestataire="prestataire"
                :class="index % 2 === 1 ? 'pr-card--decalee' : ''"
                @view-profile="voirProfil"
              />
            </div>

            <div v-if="peutVoirPlus" class="pr-more">
              <button type="button" class="pr-btn pr-btn--ghost" :disabled="prestataireStore.isSearching" @click="voirPlusResultats">
                {{ prestataireStore.isSearching ? 'Chargement…' : 'Voir plus de prestataires' }}
              </button>
              <p class="pr-more__note">{{ totalResultats }} résultat{{ pluriel(totalResultats) }} au total</p>
            </div>
          </template>
        </section>

        <aside class="pr-map">
          <ProvidersMap
            ref="providersMapRef"
            :client-location="clientLocation"
            client-label="Votre position"
            :providers="resultatsAffiches"
            :rayon-km="positionActive ? filtres.rayon_km : null"
            class="h-full"
            @view-profile="surClicMarqueur"
          />
          <div class="pr-map__badge">
            <p class="pr-map__count">{{ resultatsAffiches.length }} prestataire{{ pluriel(resultatsAffiches.length) }}</p>
            <p v-if="positionActive" class="pr-map__radius">rayon de {{ filtres.rayon_km }} km</p>
          </div>
        </aside>
      </div>
    </div>

    <Modal v-model="filtresOuverts" title="Filtres de recherche">
      <SearchFilters v-model="filtres" :categories="catalogueStore.categories" :position-active="positionActive" @apply="appliquerFiltres" @reset="reinitialiser" />
    </Modal>
  </ClientLayout>
</template>

<style scoped>
/* Conteneur "large" (grille commune CLIENT) : pas de max-width, cette page
   a besoin de toute la largeur pour cartes + carte géo, comme l'accueil. */
.pr-page { width: 100%; margin: 0 auto; padding: 2.5rem 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
@media (min-width: 640px) { .pr-page { padding: 3rem 2rem; gap: 2rem; } }

.pr-icon-xs { width: 0.8125rem; height: 0.8125rem; }
.pr-icon-sm { width: 1rem; height: 1rem; }
.pr-icon-md { width: 1.375rem; height: 1.375rem; }

.pr-nl__comprehension { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.75rem; }
.pr-nl__comprehension-label { color: var(--color-mimosy-secondary); font-weight: 600; }
.pr-nl__chip { padding: 0.25rem 0.625rem; border-radius: 999px; background: var(--color-mimosy-primaryBg); color: var(--color-mimosy-primary); font-weight: 600; }
.pr-nl__chip--urgent { background: #fff0ee; color: #a85148; }

.pr-categories { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.pr-chip {
  border-radius: 999px; padding: 0.5rem 1.25rem; font-family: var(--font-sans); font-size: 13px; font-weight: 700;
  border: 1px solid var(--color-mimosy-border); background: var(--color-mimosy-surface); color: var(--color-mimosy-secondary);
  transition: all 0.18s ease;
}
.pr-chip:hover:not(.pr-chip--active) { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }
.pr-chip--active { background: var(--color-mimosy-text); border-color: var(--color-mimosy-text); color: #fff; }
.pr-categories__sep { width: 1px; height: 1.5rem; background: var(--color-mimosy-border); margin: 0 0.25rem; }

.pr-filter {
  display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem;
  border: 1px solid var(--color-mimosy-border); border-radius: 999px; background: var(--color-mimosy-surface);
  color: var(--color-mimosy-secondary); font-family: var(--font-sans); font-size: 0.75rem; font-weight: 700;
  cursor: pointer; transition: all 0.18s ease;
}
.pr-filter:hover:not(:disabled):not(.pr-filter--active) { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }
.pr-filter:disabled { opacity: 0.6; cursor: default; }
.pr-filter--active { background: var(--color-mimosy-primaryBg); border-color: var(--color-mimosy-primary); color: var(--color-mimosy-primary); }
.pr-filter__badge {
  display: inline-flex; align-items: center; justify-content: center; min-width: 1.125rem; height: 1.125rem;
  padding: 0 0.25rem; border-radius: 999px; background: var(--color-mimosy-primary); color: #fff; font-size: 0.625rem; font-weight: 700;
}

.pr-position-note { display: flex; align-items: center; gap: 0.375rem; margin-top: -1rem; font-size: 0.8125rem; color: var(--color-mimosy-primary); }
.pr-position-note--error { color: #a85148; }

.pr-results__head { display: flex; flex-direction: column; gap: 0.75rem; }
@media (min-width: 640px) { .pr-results__head { flex-direction: row; align-items: center; justify-content: space-between; } }
.pr-results__count { margin: 0; font-size: 1.5rem; font-weight: 400; color: var(--color-mimosy-text); }
.pr-results__sub { display: flex; align-items: center; gap: 0.375rem; margin: 0.25rem 0 0; font-family: var(--font-sans); font-size: 0.875rem; color: var(--color-mimosy-secondary); }
.pr-reset {
  display: inline-flex; align-items: center; gap: 0.375rem; flex-shrink: 0; padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-mimosy-border); border-radius: 8px; background: var(--color-mimosy-surface);
  color: var(--color-mimosy-secondary); font-family: var(--font-sans); font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}
.pr-reset:hover { border-color: var(--color-mimosy-primary); color: var(--color-mimosy-text); }

.pr-layout { display: grid; gap: 1.5rem; }
@media (min-width: 1280px) { .pr-layout { grid-template-columns: minmax(0, 1fr) 380px; align-items: start; gap: 2rem; } }
.pr-results { min-width: 0; }

.pr-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
@media (min-width: 640px) { .pr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .pr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.pr-card--decalee { transition: transform 0.2s; }
@media (min-width: 640px) and (max-width: 1279.98px) { .pr-card--decalee { margin-top: 3rem; } }

.pr-more { margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.pr-more__note { margin: 0; font-size: 0.8125rem; color: var(--color-mimosy-secondary); }

.pr-skel-card { display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; border: 1px solid var(--color-mimosy-border); background: var(--color-mimosy-surface); }
.pr-skel-lines { display: grid; gap: 0.625rem; padding: 1.25rem; }
.pr-skel { border-radius: 6px; background: linear-gradient(90deg, var(--color-mimosy-page) 25%, #eceff0 37%, var(--color-mimosy-page) 63%); background-size: 400% 100%; animation: pr-shimmer 1.4s ease infinite; }
.pr-skel--photo { height: 200px; border-radius: 0; }
.pr-skel--line { height: 0.75rem; width: 80%; }
.pr-skel--short { width: 45%; }
@keyframes pr-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .pr-skel { animation: none; } }

.pr-state { padding: 2.5rem 1.5rem; border-radius: 24px; text-align: center; }
.pr-state--error { border: 1px solid #a85148; background: #fbeeec; }
.pr-state--error .pr-state__title, .pr-state--error .pr-state__text { color: #a85148; }
.pr-state--empty { border: 1px dashed var(--color-mimosy-border); background: var(--color-mimosy-surface); }
.pr-state__icon { margin: 0 auto 1rem; width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: var(--color-mimosy-primaryBg); color: var(--color-mimosy-primary); }
.pr-state__title { margin: 0; font-size: 1.0625rem; font-weight: 400; color: var(--color-mimosy-text); }
.pr-state__text { margin: 0.5rem auto 0; max-width: 34rem; font-family: var(--font-sans); font-size: 0.875rem; line-height: 1.6; color: var(--color-mimosy-secondary); }

.pr-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1.25rem;
  padding: 0.6875rem 1.125rem; border: 1px solid var(--color-mimosy-primary); border-radius: 12px;
  background: var(--color-mimosy-primary); color: #fff; font-family: var(--font-sans); font-size: 0.875rem; font-weight: 600; cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}
.pr-btn:hover:not(:disabled) { opacity: 0.9; }
.pr-btn:disabled { opacity: 0.6; cursor: default; }
.pr-btn--ghost { background: var(--color-mimosy-surface); color: var(--color-mimosy-primary); }
.pr-btn--ghost:hover:not(:disabled) { background: var(--color-mimosy-primaryBg); opacity: 1; }

.pr-map { position: relative; height: 320px; border-radius: 24px; overflow: hidden; border: 1px solid var(--color-mimosy-border); }
@media (min-width: 640px) { .pr-map { height: 420px; } }
@media (min-width: 1280px) { .pr-map { height: 100%; min-height: 560px; position: sticky; top: 1.5rem; } }
.pr-map__badge {
  position: absolute; bottom: 0.75rem; left: 0.75rem; z-index: 1000; padding: 0.5rem 0.75rem; border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.7); background: rgba(255,255,255,0.92); pointer-events: none;
}
.pr-map__count { margin: 0; font-size: 0.75rem; font-weight: 700; color: var(--color-mimosy-text); }
.pr-map__radius { margin: 0.125rem 0 0; font-size: 0.6875rem; color: var(--color-mimosy-secondary); }
</style>
