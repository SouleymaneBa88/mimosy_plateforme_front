<script setup>
/**
 * ClientDashboard.vue
 * ------------------------------------------------------------------
 * Page d'accueil de l'espace client.
 *
 * RÉSOLUTION DES PRESTATAIRES
 * ------------------------------------------------------------------
 * L'API des demandes renvoie `prestataire` sous forme d'identifiant.
 * Afficher cet identifiant brut n'a aucun sens pour le client, donc :
 *   1. on indexe les prestataires déjà chargés (id -> profil) ;
 *   2. chaque demande récupère le nom et la photo correspondants ;
 *   3. si l'API sérialise déjà le prestataire en objet, cet objet est
 *      utilisé tel quel — les deux formats sont acceptés.
 * ------------------------------------------------------------------
 */

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, RotateCcw } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import ServiceSearch from '@/components/client/ServiceSearch.vue'
import ServiceCategories from '@/components/client/ServiceCategories.vue'
import NearbyProviders from '@/components/client/NearbyProviders.vue'
import RecentRequests from '@/components/client/RecentRequests.vue'

import { useCatalogueStore } from '@/stores/catalogue'
import { usePrestataireStore } from '@/stores/prestataire'
import { useDemandePrestationStore } from '@/stores/demandePrestation'

const router = useRouter()
const catalogueStore = useCatalogueStore()
const prestataireStore = usePrestataireStore()
const demandeStore = useDemandePrestationStore()

/* ---------------------------------------------------------------- *
 * Utilitaires d'identité (nom, initiales, photo)
 * ---------------------------------------------------------------- */

/** Construit "Prénom Nom" à partir d'un profil, avec replis successifs. */
function nomComplet(profile) {
  if (!profile) return ''
  const complet = [profile.user_first_name, profile.user_last_name].filter(Boolean).join(' ').trim()
  return complet || profile.nom_complet || profile.user_email || ''
}

/** Deux initiales maximum, utilisées quand aucune photo n'est disponible. */
function initiales(nom) {
  if (!nom) return '?'
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('')
}

/** Récupère l'URL de photo quel que soit le nom de champ utilisé par l'API. */
function photoDe(profile) {
  if (!profile) return ''
  return profile.photo || profile.avatar || profile.image || profile.user_photo || ''
}

/* ---------------------------------------------------------------- *
 * Index des prestataires : id -> profil complet
 * ---------------------------------------------------------------- */
const prestataireIndex = computed(() => {
  const index = new Map()
  prestataireStore.prestataires.forEach((profile) => {
    if (profile?.id !== undefined && profile?.id !== null) index.set(String(profile.id), profile)
  })
  return index
})

/**
 * Retrouve le profil derrière la valeur `prestataire` d'une demande.
 * Accepte un objet sérialisé, un identifiant, ou des champs aplatis.
 */
function resoudrePrestataire(demande) {
  const reference = demande?.prestataire

  // Cas 1 : l'API a déjà sérialisé l'objet prestataire.
  if (reference && typeof reference === 'object') return reference

  // Cas 2 : identifiant simple -> on cherche dans les prestataires chargés.
  if (reference !== undefined && reference !== null && reference !== '') {
    const trouve = prestataireIndex.value.get(String(reference))
    if (trouve) return trouve
  }

  // Cas 3 : certains sérialiseurs exposent des champs aplatis.
  if (demande?.prestataire_nom || demande?.prestataire_user_first_name) {
    return {
      user_first_name: demande.prestataire_user_first_name,
      user_last_name: demande.prestataire_user_last_name,
      nom_complet: demande.prestataire_nom,
      photo: demande.prestataire_photo,
    }
  }

  return null
}

/* ---------------------------------------------------------------- *
 * Données normalisées pour les composants enfants
 * ---------------------------------------------------------------- */

const categories = computed(() =>
  catalogueStore.categories.map((category) => ({
    id: category.id,
    name: category.nom,
    description: category.description,
    icon: category.image || '',
  })),
)

const providers = computed(() =>
  prestataireStore.prestataires.map((profile) => {
    const name = nomComplet(profile) || 'Prestataire'
    return {
      id: profile.id,
      name,
      profession: profile.description || 'Profil prestataire',
      // Photo réelle du prestataire + repli en initiales pour la carte.
      avatar: photoDe(profile),
      photo: photoDe(profile),
      initials: initiales(name),
      verified: profile.statut_verification === 'VERIFIE',
      available: Boolean(profile.disponibilite),
      rating: null,
      reviews: null,
      distance: null,
      latitude: null,
      longitude: null,
    }
  }),
)

// Libellés lisibles des statuts de demande.
const STATUTS = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const requests = computed(() =>
  demandeStore.demandes.slice(0, 5).map((request) => {
    const profile = resoudrePrestataire(request)
    const providerName = nomComplet(profile) || 'Prestataire'

    return {
      id: request.id,
      // Nom du service si l'API le fournit, sinon repli sur la description.
      service: request.service?.nom || request.service_nom || request.description,
      description: request.description,

      // Nom affiché (jamais l'identifiant).
      provider: providerName,
      providerName,
      providerId: profile?.id ?? request.prestataire ?? null,

      // Visuel de la carte : photo réelle, initiales en repli.
      providerAvatar: photoDe(profile),
      avatar: photoDe(profile),
      initials: initiales(providerName),
      verified: profile?.statut_verification === 'VERIFIE',

      date: request.date_creation ? new Date(request.date_creation).toLocaleDateString('fr-FR') : '',
      status: STATUTS[request.statut] || request.statut,
      statusCode: request.statut,
    }
  }),
)

/* ---------------------------------------------------------------- *
 * États globaux
 * ---------------------------------------------------------------- */
const isLoading = computed(() => catalogueStore.isLoading || prestataireStore.isLoading || demandeStore.isLoading)
const errorMessage = computed(() => catalogueStore.errorMessage || prestataireStore.errorMessage || demandeStore.errorMessage)

// Compteur de tentatives : force le remontage des squelettes au réessai.
const retryCount = ref(0)

/* ---------------------------------------------------------------- *
 * Chargement des données
 * ---------------------------------------------------------------- */
function chargerDonnees() {
  return Promise.all([
    catalogueStore.chargerCatalogue(),
    prestataireStore.chargerPrestataires(),
    demandeStore.chargerDemandes(),
  ]).catch(() => {
    // Les messages d'erreur détaillés restent dans les stores.
  })
}

function reessayer() {
  retryCount.value += 1
  chargerDonnees()
}

onMounted(chargerDonnees)

/* ---------------------------------------------------------------- *
 * Navigation
 * ---------------------------------------------------------------- */
function afficherCategorie(category) {
  router.push({ name: 'trouver-service', query: { categorie: category.id } })
}

function afficherPrestataire(provider) {
  router.push({ name: 'client.prestataire', params: { id: provider.id } })
}

function afficherDemande(request) {
  router.push({ name: 'detais.demande', params: { id: request.id } })
}

function afficherToutesLesDemandes() {
  router.push({ name: 'demandes' })
}
</script>

<template>
  <AppLayout>
    <div class="cd-page">
      <!-- En-tête et recherche : toujours visibles, même pendant le
           chargement, pour que la page ne paraisse jamais vide. -->
      <ClientHeader />
      <ServiceSearch />

      <!-- ============================================================ -->
      <!-- État : chargement (squelettes plutôt qu'un simple texte)      -->
      <!-- ============================================================ -->
      <div v-if="isLoading" :key="retryCount" class="cd-sections" aria-busy="true" aria-live="polite">
        <span class="cd-sr">Chargement de vos données…</span>

        <section class="cd-skel-card">
          <div class="cd-skel cd-skel--title"></div>
          <div class="cd-skel-grid cd-skel-grid--cats">
            <div v-for="n in 6" :key="`cat-${n}`" class="cd-skel-tile">
              <div class="cd-skel cd-skel--icon"></div>
              <div class="cd-skel cd-skel--line"></div>
              <div class="cd-skel cd-skel--line cd-skel--short"></div>
            </div>
          </div>
        </section>

        <section class="cd-skel-card">
          <div class="cd-skel cd-skel--title"></div>
          <div class="cd-skel-grid cd-skel-grid--providers">
            <div v-for="n in 3" :key="`prov-${n}`" class="cd-skel-tile cd-skel-tile--row">
              <div class="cd-skel cd-skel--avatar"></div>
              <div class="cd-skel-tile__body">
                <div class="cd-skel cd-skel--line"></div>
                <div class="cd-skel cd-skel--line cd-skel--short"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="cd-skel-card">
          <div class="cd-skel cd-skel--title"></div>
          <div class="cd-skel-rows">
            <div v-for="n in 3" :key="`req-${n}`" class="cd-skel cd-skel--row"></div>
          </div>
        </section>
      </div>

      <!-- ============================================================ -->
      <!-- État : erreur                                                 -->
      <!-- ============================================================ -->
      <div v-else-if="errorMessage" class="cd-error" role="alert">
        <AlertTriangle class="cd-error__icon" :stroke-width="1.75" />
        <div class="cd-error__body">
          <p class="cd-display cd-error__title">Impossible de charger vos données</p>
          <p class="cd-error__text">{{ errorMessage }}</p>
        </div>
        <button type="button" class="cd-btn" @click="reessayer">
          <RotateCcw class="cd-btn__icon" :stroke-width="2.25" />
          Réessayer
        </button>
      </div>

      <!-- ============================================================ -->
      <!-- État : contenu                                                -->
      <!-- ============================================================ -->
      <div v-else class="cd-sections">
        <ServiceCategories :categories="categories" @select="afficherCategorie" />
        <NearbyProviders :providers="providers" @view-profile="afficherPrestataire" />
        <RecentRequests :requests="requests" @view-all="afficherToutesLesDemandes" @view-details="afficherDemande" />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/*
 * Mise en page du tableau de bord.
 * Les jetons (--pp-*) viennent de :root ; les valeurs de repli après
 * la virgule garantissent un rendu correct si cette page est ouverte
 * avant le profil prestataire.
 */
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap');

.cd-page {
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
  .cd-page { gap: 2.25rem; }
}

.cd-sections {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

@media (min-width: 1024px) {
  .cd-sections { gap: 2.25rem; }
}

.cd-display {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  font-optical-sizing: auto;
  letter-spacing: -0.01em;
}

.cd-sr {
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

/* ------------------------------------------------------------------ *
 * Squelettes de chargement
 * ------------------------------------------------------------------ */
.cd-skel-card {
  background: var(--pp-surface, #ffffff);
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: var(--pp-radius-lg, 16px);
  padding: 1.5rem;
  box-shadow: var(--pp-shadow-sm, 0 1px 2px rgba(20, 38, 31, 0.05));
}

.cd-skel-grid {
  display: grid;
  gap: 0.875rem;
  margin-top: 1.25rem;
}
.cd-skel-grid--cats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cd-skel-grid--providers { grid-template-columns: repeat(1, minmax(0, 1fr)); }

@media (min-width: 640px) {
  .cd-skel-grid--cats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cd-skel-grid--providers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .cd-skel-grid--cats { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .cd-skel-grid--providers { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.cd-skel-tile {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--pp-border, #dce1db);
  border-radius: var(--pp-radius-md, 12px);
}
.cd-skel-tile--row {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.875rem;
}
.cd-skel-tile__body { display: grid; gap: 0.5rem; }

.cd-skel-rows { display: grid; gap: 0.75rem; margin-top: 1.25rem; }

.cd-skel {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--pp-canvas, #f6f8f6) 25%,
    #eceff0 37%,
    var(--pp-canvas, #f6f8f6) 63%
  );
  background-size: 400% 100%;
  animation: cd-shimmer 1.4s ease infinite;
}

.cd-skel--title { height: 1.25rem; width: 11rem; }
.cd-skel--line { height: 0.75rem; width: 100%; }
.cd-skel--short { width: 60%; }
.cd-skel--icon { height: 2.5rem; width: 2.5rem; border-radius: var(--pp-radius-sm, 8px); }
.cd-skel--avatar { height: 3rem; width: 3rem; border-radius: 999px; }
.cd-skel--row { height: 4.25rem; border-radius: var(--pp-radius-md, 12px); }

@keyframes cd-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .cd-skel { animation: none; }
}

/* ------------------------------------------------------------------ *
 * État d'erreur
 * ------------------------------------------------------------------ */
.cd-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  border: 1px solid var(--pp-danger, #a85148);
  border-radius: var(--pp-radius-lg, 16px);
  background: var(--pp-danger-tint, #fbeeec);
}

@media (min-width: 640px) {
  .cd-error {
    flex-direction: row;
    align-items: center;
    text-align: left;
    padding: 1.5rem 1.75rem;
  }
}

.cd-error__icon {
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  color: var(--pp-danger, #a85148);
}
.cd-error__body { flex: 1; min-width: 0; }
.cd-error__title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--pp-danger, #a85148);
}
.cd-error__text {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--pp-danger, #a85148);
  opacity: 0.85;
}

.cd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.6875rem 1.125rem;
  border: 1px solid var(--pp-danger, #a85148);
  border-radius: var(--pp-radius-md, 12px);
  background: var(--pp-surface, #ffffff);
  color: var(--pp-danger, #a85148);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.cd-btn:hover { background: var(--pp-danger, #a85148); color: #fff; }
.cd-btn:active { transform: translateY(1px); }
.cd-btn__icon { width: 0.9375rem; height: 0.9375rem; }
</style>