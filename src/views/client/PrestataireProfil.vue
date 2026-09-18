<script setup>
/**
 * PrestataireProfile.vue
 * ------------------------------------------------------------------
 * Page de profil public d'un prestataire de services.
 *
 * Affiche l'identité, les services/tarifs et les compétences d'un
 * prestataire, et permet au client de :
 *   1. Envoyer une "demande de prestation" (réservation directe)
 *   2. Envoyer une "demande de devis" (estimation avant engagement)
 *
 * La logique métier n'a pas été modifiée : seule l'interface a été
 * retravaillée.
 *
 * NOTE IMPORTANTE SUR LES MODALES
 * ------------------------------------------------------------------
 * Les modales sont déplacées dans <body> par <Teleport>. Elles ne sont
 * donc PAS descendantes de .provider-profile : si les variables CSS
 * sont déclarées sur ce conteneur, elles ne les héritent pas et
 * s'affichent sans couleurs ni bordures. Les jetons sont désormais
 * déclarés sur :root (préfixe "pp-" pour éviter toute collision avec
 * le design system global de l'application).
 * ------------------------------------------------------------------
 */

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeCheck,
  Briefcase,
  ChevronRight,
  Clock3,
  MapPin,
  MessageSquareQuote,
  Sparkles,
  X,
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'
import * as devisService from '@/services/devisService'

const route = useRoute()
const router = useRouter()
const prestataireStore = usePrestataireStore()
const demandeStore = useDemandePrestationStore()

/* ---------------------------------------------------------------- *
 * État local des deux modales (prestation / devis)
 * ---------------------------------------------------------------- */
const demandeModalOpen = ref(false)
const devisModalOpen = ref(false)
const demandeEnvoyee = ref(false)
const devisEnvoye = ref(false)
const devisError = ref('')
const devisLoading = ref(false)

const demandeForm = reactive({ service: '', description: '', date_souhaitee: '', budget: '' })
const devisForm = reactive({ service: '', description: '', date_souhaitee: '', budget_estime: '' })

/* ---------------------------------------------------------------- *
 * Propriétés calculées dérivées du prestataire chargé
 * ---------------------------------------------------------------- */

// Le prestataire actuellement sélectionné dans le store.
const prestataire = computed(() => prestataireStore.prestataireSelectionne)

// Offres de service proposées par ce prestataire.
const services = computed(() => prestataire.value?.services || [])

// Offres réellement réservables (utilisées dans les deux formulaires).
const servicesDisponibles = computed(() => services.value.filter((offer) => offer.disponible))

// Catégories uniques déduites des offres (dédupliquées par id).
const categories = computed(() => {
  const unique = new Map()
  services.value.forEach((offer) => {
    if (offer.service?.categorie) unique.set(offer.service.categorie.id, offer.service.categorie)
  })
  return [...unique.values()]
})

// Compétences uniques déduites des offres (dédupliquées par id).
const competences = computed(() => {
  const unique = new Map()
  services.value.forEach((offer) => {
    offer.competences?.forEach((competence) => unique.set(competence.id, competence))
  })
  return [...unique.values()]
})

// Nom affiché : "Prénom Nom", avec repli sur "Prestataire".
const displayName = computed(
  () => [prestataire.value?.user_first_name, prestataire.value?.user_last_name].filter(Boolean).join(' ') || 'Prestataire',
)

const isLoading = computed(() => prestataireStore.isLoading)

// Une modale est-elle ouverte ? (sert au verrouillage du défilement)
const anyModalOpen = computed(() => demandeModalOpen.value || devisModalOpen.value)

/* ---------------------------------------------------------------- *
 * Confort d'utilisation des modales
 *  - blocage du défilement de la page en arrière-plan
 *  - fermeture à la touche Échap
 * ---------------------------------------------------------------- */
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function onKeydown(event) {
  if (event.key !== 'Escape') return
  if (devisModalOpen.value) fermerDevisModal()
  else if (demandeModalOpen.value) fermerDemandeModal()
}

/* ---------------------------------------------------------------- *
 * Cycle de vie : chargement du prestataire depuis l'URL
 * ---------------------------------------------------------------- */
onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  try {
    await prestataireStore.chargerPrestataire(route.params.id)
    // Support du paramètre ?refaire=true pour rouvrir directement
    // la modale de demande (ex. depuis un lien "refaire une demande").
    if (route.query.refaire === 'true') demanderPrestation()
  } catch {
    // L'erreur est affichée par l'état du store.
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

/* ---------------------------------------------------------------- *
 * Navigation
 * ---------------------------------------------------------------- */
function retourListe() {
  router.push({ name: 'client.services' })
}

/* ---------------------------------------------------------------- *
 * Modale "Demander une prestation"
 * ---------------------------------------------------------------- */
function demanderPrestation() {
  demandeEnvoyee.value = false
  demandeStore.errorMessage = ''
  // Pré-sélectionne le premier service disponible pour accélérer la saisie.
  demandeForm.service = servicesDisponibles.value[0]?.service?.id || ''
  demandeModalOpen.value = true
}

async function envoyerDemande() {
  if (!prestataire.value?.id || !demandeForm.service || !demandeForm.description.trim() || !demandeForm.date_souhaitee || !demandeForm.budget) {
    demandeStore.errorMessage = 'Veuillez renseigner tous les champs de la demande.'
    return
  }

  try {
    await demandeStore.creerDemande({
      prestataire: prestataire.value.id,
      service: demandeForm.service,
      description: demandeForm.description.trim(),
      date_souhaitee: new Date(demandeForm.date_souhaitee).toISOString(),
      budget: demandeForm.budget,
    })
    demandeEnvoyee.value = true
    demandeForm.service = ''
    demandeForm.description = ''
    demandeForm.date_souhaitee = ''
    demandeForm.budget = ''
  } catch {
    // L'erreur détaillée reste disponible dans le store.
  }
}

function fermerDemandeModal() {
  demandeModalOpen.value = false
  demandeStore.errorMessage = ''
}

/* ---------------------------------------------------------------- *
 * Modale "Demander un devis"
 * ---------------------------------------------------------------- */
function demanderDevis() {
  devisEnvoye.value = false
  devisError.value = ''
  devisForm.service = servicesDisponibles.value[0]?.service?.id || ''
  devisModalOpen.value = true
}

async function envoyerDevis() {
  if (!prestataire.value?.id || !devisForm.service || !devisForm.description.trim() || !devisForm.date_souhaitee || !devisForm.budget_estime) {
    devisError.value = 'Veuillez renseigner tous les champs de la demande de devis.'
    return
  }

  devisLoading.value = true
  devisError.value = ''
  try {
    await devisService.createQuoteRequest({
      prestataire: prestataire.value.id,
      service: devisForm.service,
      description: devisForm.description.trim(),
      date_souhaitee: new Date(devisForm.date_souhaitee).toISOString(),
      budget_estime: devisForm.budget_estime,
    })
    devisEnvoye.value = true
    devisForm.service = ''
    devisForm.description = ''
    devisForm.date_souhaitee = ''
    devisForm.budget_estime = ''
  } catch (error) {
    devisError.value = error.message
  } finally {
    devisLoading.value = false
  }
}

function fermerDevisModal() {
  devisModalOpen.value = false
  devisError.value = ''
}
</script>

<template>
  <AppLayout>
    <div class="pp-page">
      <!-- ============================================================ -->
      <!-- États globaux : chargement / erreur / profil introuvable      -->
      <!-- ============================================================ -->
      <div v-if="isLoading" class="pp-state">
        <span class="pp-spinner" aria-hidden="true"></span>
        Chargement du profil…
      </div>

      <div v-else-if="prestataireStore.errorMessage" class="pp-state pp-state--error">
        {{ prestataireStore.errorMessage }}
      </div>

      <!-- ============================================================ -->
      <!-- Profil du prestataire                                         -->
      <!-- ============================================================ -->
      <div v-else-if="prestataire" class="pp-shell">
        <!-- Fil d'ariane -->
        <nav class="pp-breadcrumb" aria-label="Fil d'ariane">
          <button type="button" class="pp-breadcrumb__link" @click="retourListe">Trouver un prestataire</button>
          <ChevronRight class="pp-breadcrumb__sep" :stroke-width="2.5" />
          <span class="pp-breadcrumb__current">{{ displayName }}</span>
        </nav>

        <!-- ---------------------------------------------------------- -->
        <!-- Carte d'identité                                            -->
        <!-- ---------------------------------------------------------- -->
        <section class="pp-hero">
          <div v-if="prestataire.photo" class="pp-hero__avatar">
            <img :src="prestataire.photo" :alt="`Photo de ${displayName}`" />
          </div>
          <div v-else class="pp-hero__avatar pp-hero__avatar--initial pp-display" aria-hidden="true">
            {{ displayName.charAt(0) }}
          </div>

          <div class="pp-hero__body">
            <div class="pp-hero__titleRow">
              <h1 class="pp-display pp-hero__name">{{ displayName }}</h1>
              <span v-if="prestataire.statut_verification === 'VERIFIE'" class="pp-badge pp-badge--verified">
                <BadgeCheck class="pp-icon-sm" :stroke-width="2.5" /> Profil vérifié
              </span>
            </div>

            <p class="pp-hero__desc">
              {{ prestataire.description || 'Aucune description professionnelle disponible.' }}
            </p>

            <dl class="pp-hero__stats">
              <div class="pp-stat">
                <dt class="pp-stat__label"><Clock3 class="pp-icon-sm" :stroke-width="2" /> Expérience</dt>
                <dd class="pp-stat__value pp-display">{{ prestataire.experience }} an(s)</dd>
              </div>
              <div class="pp-stat">
                <dt class="pp-stat__label"><Briefcase class="pp-icon-sm" :stroke-width="2" /> Services</dt>
                <dd class="pp-stat__value pp-display">{{ services.length }}</dd>
              </div>
              <div class="pp-stat">
                <dt class="pp-stat__label">
                  <span class="pp-dot" :class="prestataire.disponibilite ? 'pp-dot--on' : 'pp-dot--off'"></span>
                  Statut
                </dt>
                <dd class="pp-stat__value pp-stat__value--text">
                  {{ prestataire.disponibilite ? 'Disponible' : 'Indisponible' }}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- ---------------------------------------------------------- -->
        <!-- Corps de page : contenu principal + colonne latérale        -->
        <!-- ---------------------------------------------------------- -->
        <div class="pp-grid">
          <div class="pp-main">
            <!-- Services et tarifs -->
            <section class="pp-card">
              <header class="pp-card__head">
                <h2 class="pp-display pp-card__title">Services et tarifs</h2>
                <span v-if="services.length" class="pp-count">{{ services.length }}</span>
              </header>

              <div v-if="services.length" class="pp-offers">
                <article v-for="offer in services" :key="offer.id" class="pp-offer">
                  <div class="pp-offer__top">
                    <div class="pp-offer__info">
                      <h3 class="pp-display pp-offer__name">{{ offer.service?.nom }}</h3>
                      <p class="pp-offer__desc">
                        {{ offer.description || offer.service?.description || 'Aucune description disponible.' }}
                      </p>
                    </div>
                    <p class="pp-display pp-offer__price">
                      {{ Number(offer.prix).toLocaleString('fr-FR') }}
                      <span class="pp-offer__unit">{{ offer.unite }}</span>
                    </p>
                  </div>
                  <span class="pp-badge" :class="offer.disponible ? 'pp-badge--on' : 'pp-badge--off'">
                    <span class="pp-dot" :class="offer.disponible ? 'pp-dot--on' : 'pp-dot--off'"></span>
                    {{ offer.disponible ? 'Disponible' : 'Indisponible' }}
                  </span>
                </article>
              </div>
              <p v-else class="pp-empty">Aucun service disponible.</p>
            </section>

            <!-- Compétences -->
            <section class="pp-card">
              <header class="pp-card__head">
                <h2 class="pp-display pp-card__title">Compétences</h2>
                <span v-if="competences.length" class="pp-count">{{ competences.length }}</span>
              </header>
              <div v-if="competences.length" class="pp-chips">
                <span v-for="competence in competences" :key="competence.id" class="pp-chip">
                  <Sparkles class="pp-icon-xs" :stroke-width="2" />
                  {{ competence.nom }}
                </span>
              </div>
              <p v-else class="pp-empty">Aucune compétence renseignée.</p>
            </section>

            <!-- Avis : déplacé sous les compétences, dans la colonne principale -->
            <section class="pp-card">
              <header class="pp-card__head">
                <h2 class="pp-display pp-card__title">Avis des clients</h2>
              </header>
              <div class="pp-empty pp-empty--illustrated">
                <MessageSquareQuote class="pp-empty__icon" :stroke-width="1.5" />
                <p class="pp-empty__title pp-display">Aucun avis pour le moment</p>
                <p class="pp-empty__text">Les retours des clients apparaîtront ici après leurs prestations.</p>
              </div>
            </section>
          </div>

          <!-- Colonne latérale : actions, catégories, localisation -->
          <aside class="pp-aside">
            <!-- Actions : mises en avant, collées en haut au défilement -->
            <section class="pp-card pp-cta">
              <p class="pp-cta__kicker">Travailler avec {{ displayName }}</p>
              <button type="button" class="pp-btn pp-btn--primary" @click="demanderPrestation">
                Demander une prestation
              </button>
              <button type="button" class="pp-btn pp-btn--ghost" @click="demanderDevis">
                Demander un devis
              </button>
              <p class="pp-cta__note">Réponse directe du prestataire. Aucun engagement avant validation.</p>
            </section>

            <!-- Catégories : affichage repensé en liste de vignettes -->
            <section class="pp-card">
              <header class="pp-card__head">
                <h2 class="pp-display pp-card__title pp-card__title--sm">Catégories</h2>
                <span v-if="categories.length" class="pp-count">{{ categories.length }}</span>
              </header>

              <ul v-if="categories.length" class="pp-cats">
                <li v-for="category in categories" :key="category.id" class="pp-cat">
                  <img v-if="category.image" :src="category.image" :alt="category.nom" class="pp-cat__img" />
                  <div v-else class="pp-cat__img pp-cat__img--fallback pp-display" aria-hidden="true">
                    {{ category.nom?.charAt(0) }}
                  </div>
                  <div class="pp-cat__body">
                    <p class="pp-display pp-cat__name">{{ category.nom }}</p>
                    <p class="pp-cat__desc">{{ category.description || 'Catégorie active' }}</p>
                  </div>
                </li>
              </ul>
              <p v-else class="pp-empty">Aucune catégorie disponible.</p>
            </section>

            <!-- Localisation -->
            <section class="pp-card">
              <header class="pp-card__head">
                <h2 class="pp-display pp-card__title pp-card__title--sm">Localisation</h2>
              </header>
              <p class="pp-aside__muted">
                <MapPin class="pp-icon-sm" :stroke-width="2" />
                Localisation non renseignée.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <div v-else class="pp-state pp-state--empty">Profil introuvable.</div>
    </div>

    <!-- ============================================================ -->
    <!-- Modales (téléportées dans <body>)                             -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <!-- Modale : Demander une prestation -->
      <Transition name="pp-modal">
        <div v-if="demandeModalOpen" class="pp-overlay" role="dialog" aria-modal="true" aria-labelledby="pp-titre-prestation" @click.self="fermerDemandeModal">
          <form class="pp-modal" @submit.prevent="envoyerDemande">
            <header class="pp-modal__head">
              <div>
                <h2 id="pp-titre-prestation" class="pp-display pp-modal__title">Demander une prestation</h2>
                <p class="pp-modal__sub">Votre demande sera envoyée à {{ displayName }}.</p>
              </div>
              <button type="button" class="pp-close" aria-label="Fermer" @click="fermerDemandeModal">
                <X class="pp-icon-sm" :stroke-width="2.5" />
              </button>
            </header>

            <div class="pp-modal__body">
              <div v-if="demandeEnvoyee" class="pp-success">
                <BadgeCheck class="pp-icon-md" :stroke-width="2" />
                <span>Votre demande a été envoyée avec succès.</span>
              </div>

              <div v-else class="pp-form">
                <label class="pp-field">
                  <span class="pp-label">Service</span>
                  <select v-model="demandeForm.service" required class="pp-input">
                    <option value="">Choisir un service</option>
                    <option v-for="offer in servicesDisponibles" :key="offer.id" :value="offer.service?.id">
                      {{ offer.service?.nom }}
                    </option>
                  </select>
                </label>

                <label class="pp-field">
                  <span class="pp-label">Description</span>
                  <textarea v-model="demandeForm.description" rows="4" required class="pp-input" placeholder="Décrivez votre besoin"></textarea>
                </label>

                <div class="pp-field-row">
                  <label class="pp-field">
                    <span class="pp-label">Date souhaitée</span>
                    <input v-model="demandeForm.date_souhaitee" type="datetime-local" required class="pp-input" />
                  </label>
                  <label class="pp-field">
                    <span class="pp-label">Budget (FCFA)</span>
                    <input v-model="demandeForm.budget" type="number" min="0.01" step="0.01" required class="pp-input" placeholder="Ex. 15000" />
                  </label>
                </div>

                <p v-if="demandeStore.errorMessage" class="pp-error">{{ demandeStore.errorMessage }}</p>
              </div>
            </div>

            <footer class="pp-modal__foot">
              <button type="button" class="pp-btn pp-btn--ghost" @click="fermerDemandeModal">
                {{ demandeEnvoyee ? 'Fermer' : 'Annuler' }}
              </button>
              <button v-if="!demandeEnvoyee" type="submit" :disabled="demandeStore.isLoading" class="pp-btn pp-btn--primary">
                {{ demandeStore.isLoading ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>

      <!-- Modale : Demander un devis -->
      <Transition name="pp-modal">
        <div v-if="devisModalOpen" class="pp-overlay" role="dialog" aria-modal="true" aria-labelledby="pp-titre-devis" @click.self="fermerDevisModal">
          <form class="pp-modal" @submit.prevent="envoyerDevis">
            <header class="pp-modal__head">
              <div>
                <h2 id="pp-titre-devis" class="pp-display pp-modal__title">Demander un devis</h2>
                <p class="pp-modal__sub">Estimation gratuite, sans engagement.</p>
              </div>
              <button type="button" class="pp-close" aria-label="Fermer" @click="fermerDevisModal">
                <X class="pp-icon-sm" :stroke-width="2.5" />
              </button>
            </header>

            <div class="pp-modal__body">
              <div v-if="devisEnvoye" class="pp-success">
                <BadgeCheck class="pp-icon-md" :stroke-width="2" />
                <span>Votre demande de devis a été envoyée.</span>
              </div>

              <div v-else class="pp-form">
                <label class="pp-field">
                  <span class="pp-label">Service</span>
                  <select v-model="devisForm.service" required class="pp-input">
                    <option value="">Choisir un service</option>
                    <option v-for="offer in servicesDisponibles" :key="offer.id" :value="offer.service?.id">
                      {{ offer.service?.nom }}
                    </option>
                  </select>
                </label>

                <label class="pp-field">
                  <span class="pp-label">Description</span>
                  <textarea v-model="devisForm.description" rows="4" required class="pp-input" placeholder="Décrivez les travaux à chiffrer"></textarea>
                </label>

                <div class="pp-field-row">
                  <label class="pp-field">
                    <span class="pp-label">Date souhaitée</span>
                    <input v-model="devisForm.date_souhaitee" type="datetime-local" required class="pp-input" />
                  </label>
                  <label class="pp-field">
                    <span class="pp-label">Budget estimé (FCFA)</span>
                    <input v-model="devisForm.budget_estime" type="number" min="0.01" step="0.01" required class="pp-input" placeholder="Ex. 25000" />
                  </label>
                </div>

                <p v-if="devisError" class="pp-error">{{ devisError }}</p>
              </div>
            </div>

            <footer class="pp-modal__foot">
              <button type="button" class="pp-btn pp-btn--ghost" @click="fermerDevisModal">
                {{ devisEnvoye ? 'Fermer' : 'Annuler' }}
              </button>
              <button v-if="!devisEnvoye" type="submit" :disabled="devisLoading" class="pp-btn pp-btn--primary">
                {{ devisLoading ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </footer>
          </form>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<!--
  Feuille de style NON scopée, volontairement.
  ------------------------------------------------------------------
  Les modales sont téléportées dans <body> : elles doivent hériter des
  mêmes jetons que la page. Tous les noms (variables et classes) sont
  préfixés "pp-" pour rester isolés du reste de l'application.
-->
<style>
/* ------------------------------------------------------------------ *
 * 1. Typographie
 *    - Newsreader (serif) : titres, chiffres, prix -> ton institutionnel
 *    - Inter (sans-serif) : texte courant, formulaires -> lisibilité
 * ------------------------------------------------------------------ */
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Texte */
  --pp-ink: #14261f;
  --pp-ink-soft: #57655c;
  --pp-ink-faint: #8a978f;

  /* Surfaces */
  --pp-surface: #ffffff;
  --pp-canvas: #f6f8f6;

  /* Identité de marque (vert profond, une seule teinte primaire) */
  --pp-primary: #234b3d;
  --pp-primary-dark: #16302a;
  --pp-primary-tint: #eaf3ee;

  /* Bordures */
  --pp-border: #dce1db;
  --pp-border-strong: #b7c2ba;

  /* États */
  --pp-danger: #a85148;
  --pp-danger-tint: #fbeeec;

  /* Rayons */
  --pp-radius-sm: 8px;
  --pp-radius-md: 12px;
  --pp-radius-lg: 16px;

  /* Ombres */
  --pp-shadow-sm: 0 1px 2px rgba(20, 38, 31, 0.05);
  --pp-shadow-md: 0 8px 24px -12px rgba(20, 38, 31, 0.18);
  --pp-shadow-lg: 0 32px 64px -24px rgba(20, 38, 31, 0.35);

  /* Échelle typographique (soutenance : tailles fixes et cohérentes) */
  --pp-text-xs: 0.75rem;    /* 12px - méta, badges          */
  --pp-text-sm: 0.875rem;   /* 14px - texte secondaire      */
  --pp-text-base: 0.9375rem;/* 15px - corps de texte        */
  --pp-text-md: 1.0625rem;  /* 17px - sous-titres           */
  --pp-text-lg: 1.25rem;    /* 20px - titres de section     */
  --pp-text-xl: 1.75rem;    /* 28px - titre de page (mobile)*/
  --pp-text-2xl: 2.25rem;   /* 36px - titre de page         */
}

.pp-page,
.pp-overlay {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--pp-ink);
  -webkit-font-smoothing: antialiased;
}

.pp-display {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  font-optical-sizing: auto;
  letter-spacing: -0.01em;
}

/* ------------------------------------------------------------------ *
 * 2. Structure de page
 * ------------------------------------------------------------------ */
.pp-shell {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.pp-grid {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .pp-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
  }
}

.pp-main,
.pp-aside {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

@media (min-width: 1024px) {
  .pp-aside {
    position: sticky;
    top: 1.5rem;
  }
}

/* Fil d'ariane */
.pp-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--pp-text-sm);
}
.pp-breadcrumb__link {
  color: var(--pp-ink-soft);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: color 0.18s ease;
}
.pp-breadcrumb__link:hover { color: var(--pp-primary); }
.pp-breadcrumb__sep { width: 0.875rem; height: 0.875rem; color: var(--pp-border-strong); }
.pp-breadcrumb__current { font-weight: 600; color: var(--pp-ink); }

/* ------------------------------------------------------------------ *
 * 3. En-tête du profil
 * ------------------------------------------------------------------ */
.pp-hero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--pp-surface);
  border: 1px solid var(--pp-border);
  border-left: 3px solid var(--pp-primary);
  border-radius: var(--pp-radius-lg);
  box-shadow: var(--pp-shadow-sm);
}

@media (min-width: 640px) {
  .pp-hero { flex-direction: row; padding: 2rem; gap: 2rem; }
}

.pp-hero__avatar {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--pp-radius-md);
  border: 1px solid var(--pp-border);
}
.pp-hero__avatar img { width: 100%; height: 100%; object-fit: cover; }
.pp-hero__avatar--initial {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pp-primary-tint);
  color: var(--pp-primary);
  font-size: 2.25rem;
  font-weight: 600;
}
@media (min-width: 640px) {
  .pp-hero__avatar { width: 128px; height: 128px; }
}

.pp-hero__body { flex: 1; min-width: 0; }

.pp-hero__titleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.pp-hero__name {
  font-size: var(--pp-text-xl);
  font-weight: 600;
  line-height: 1.15;
  margin: 0;
}
@media (min-width: 640px) {
  .pp-hero__name { font-size: var(--pp-text-2xl); }
}

.pp-hero__desc {
  margin: 0.875rem 0 0;
  max-width: 62ch;
  font-size: var(--pp-text-base);
  line-height: 1.7;
  color: var(--pp-ink-soft);
}

.pp-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.25rem 0 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--pp-border);
}

.pp-stat {
  flex: 1 1 140px;
  padding: 0.75rem 1rem;
  background: var(--pp-canvas);
  border-radius: var(--pp-radius-sm);
}
.pp-stat__label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--pp-text-xs);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pp-ink-faint);
}
.pp-stat__value {
  margin: 0.25rem 0 0;
  font-size: var(--pp-text-md);
  font-weight: 600;
  color: var(--pp-ink);
}
.pp-stat__value--text { font-family: 'Inter', sans-serif; font-size: var(--pp-text-sm); }

/* ------------------------------------------------------------------ *
 * 4. Cartes de contenu
 * ------------------------------------------------------------------ */
.pp-card {
  background: var(--pp-surface);
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--pp-shadow-sm);
}

.pp-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--pp-border);
}

.pp-card__title {
  margin: 0;
  font-size: var(--pp-text-lg);
  font-weight: 600;
}
.pp-card__title--sm { font-size: var(--pp-text-md); }

.pp-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: var(--pp-primary-tint);
  color: var(--pp-primary);
  font-size: var(--pp-text-xs);
  font-weight: 600;
}

/* Offres de service */
.pp-offers { display: grid; gap: 1rem; margin-top: 1.25rem; }

.pp-offer {
  padding: 1.25rem;
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-md);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}
.pp-offer:hover {
  border-color: var(--pp-primary);
  box-shadow: var(--pp-shadow-md);
  transform: translateY(-2px);
}

.pp-offer__top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.pp-offer__info { min-width: 0; flex: 1 1 60%; }
.pp-offer__name { margin: 0; font-size: var(--pp-text-md); font-weight: 600; }
.pp-offer__desc {
  margin: 0.375rem 0 0;
  font-size: var(--pp-text-sm);
  line-height: 1.6;
  color: var(--pp-ink-soft);
}
.pp-offer__price {
  margin: 0;
  white-space: nowrap;
  font-size: var(--pp-text-lg);
  font-weight: 600;
  color: var(--pp-primary);
}
.pp-offer__unit {
  font-family: 'Inter', sans-serif;
  font-size: var(--pp-text-xs);
  font-weight: 500;
  color: var(--pp-ink-faint);
}

/* Compétences */
.pp-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
.pp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  border: 1px solid var(--pp-border);
  border-radius: 999px;
  background: var(--pp-canvas);
  font-size: var(--pp-text-sm);
  color: var(--pp-ink);
  transition: border-color 0.18s ease, background 0.18s ease;
}
.pp-chip:hover { border-color: var(--pp-primary); background: var(--pp-primary-tint); }
.pp-chip svg { color: var(--pp-primary); }

/* Catégories (affichage repensé) */
.pp-cats { list-style: none; margin: 1.25rem 0 0; padding: 0; display: grid; gap: 0.625rem; }
.pp-cat {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.625rem;
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-md);
  background: var(--pp-surface);
  transition: border-color 0.18s ease, background 0.18s ease;
}
.pp-cat:hover { border-color: var(--pp-primary); background: var(--pp-primary-tint); }
.pp-cat__img {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--pp-radius-sm);
  border: 1px solid var(--pp-border);
}
.pp-cat__img--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pp-primary);
  color: #fff;
  font-size: var(--pp-text-md);
  font-weight: 600;
  border-color: var(--pp-primary);
}
.pp-cat__body { min-width: 0; }
.pp-cat__name {
  margin: 0;
  font-size: var(--pp-text-base);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pp-cat__desc {
  margin: 0.125rem 0 0;
  font-size: var(--pp-text-xs);
  line-height: 1.45;
  color: var(--pp-ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Bloc d'appel à l'action */
.pp-cta { display: flex; flex-direction: column; gap: 0.75rem; }
.pp-cta__kicker {
  margin: 0;
  font-size: var(--pp-text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pp-ink-faint);
}
.pp-cta__note {
  margin: 0.25rem 0 0;
  font-size: var(--pp-text-xs);
  line-height: 1.5;
  color: var(--pp-ink-faint);
  text-align: center;
}

.pp-aside__muted {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0 0;
  font-size: var(--pp-text-sm);
  color: var(--pp-ink-soft);
}

/* ------------------------------------------------------------------ *
 * 5. Éléments partagés : badges, boutons, états vides
 * ------------------------------------------------------------------ */
.pp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border: 1px solid var(--pp-border);
  border-radius: 999px;
  font-size: var(--pp-text-xs);
  font-weight: 600;
}
.pp-badge--verified {
  border-color: var(--pp-primary);
  background: var(--pp-primary-tint);
  color: var(--pp-primary);
}
.pp-badge--on { margin-top: 1rem; border-color: var(--pp-primary); color: var(--pp-primary); }
.pp-badge--off { margin-top: 1rem; border-color: var(--pp-border-strong); color: var(--pp-ink-faint); }

.pp-dot { width: 0.4375rem; height: 0.4375rem; border-radius: 999px; display: inline-block; }
.pp-dot--on { background: var(--pp-primary); box-shadow: 0 0 0 3px var(--pp-primary-tint); }
.pp-dot--off { background: var(--pp-border-strong); }

.pp-icon-xs { width: 0.75rem; height: 0.75rem; }
.pp-icon-sm { width: 1rem; height: 1rem; }
.pp-icon-md { width: 1.25rem; height: 1.25rem; }

.pp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8125rem 1.125rem;
  border-radius: var(--pp-radius-md);
  border: 1px solid transparent;
  font-family: inherit;
  font-size: var(--pp-text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
}
.pp-btn:active { transform: translateY(1px); }
.pp-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.pp-btn--primary {
  background: var(--pp-primary);
  border-color: var(--pp-primary);
  color: #fff;
}
.pp-btn--primary:hover:not(:disabled) { background: var(--pp-primary-dark); border-color: var(--pp-primary-dark); }

.pp-btn--ghost {
  background: var(--pp-surface);
  border-color: var(--pp-border-strong);
  color: var(--pp-ink);
}
.pp-btn--ghost:hover:not(:disabled) { border-color: var(--pp-primary); color: var(--pp-primary); background: var(--pp-primary-tint); }

/* États vides et globaux */
.pp-empty {
  margin-top: 1.25rem;
  padding: 1.5rem;
  border: 1px dashed var(--pp-border);
  border-radius: var(--pp-radius-md);
  text-align: center;
  font-size: var(--pp-text-sm);
  color: var(--pp-ink-soft);
}
.pp-empty--illustrated { padding: 2.25rem 1.5rem; }
.pp-empty__icon { width: 2rem; height: 2rem; margin: 0 auto 0.75rem; color: var(--pp-border-strong); display: block; }
.pp-empty__title { margin: 0; font-size: var(--pp-text-md); font-weight: 600; color: var(--pp-ink); }
.pp-empty__text { margin: 0.25rem 0 0; font-size: var(--pp-text-sm); color: var(--pp-ink-soft); }

.pp-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 3rem 1.5rem;
  max-width: 1120px;
  margin: 0 auto;
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-lg);
  background: var(--pp-surface);
  color: var(--pp-ink-soft);
  font-size: var(--pp-text-sm);
}
.pp-state--error { border-color: var(--pp-danger); background: var(--pp-danger-tint); color: var(--pp-danger); }
.pp-state--empty { border-style: dashed; }

.pp-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--pp-border);
  border-top-color: var(--pp-primary);
  border-radius: 999px;
  animation: pp-spin 0.7s linear infinite;
}
@keyframes pp-spin { to { transform: rotate(360deg); } }

/* ------------------------------------------------------------------ *
 * 6. Modales
 *    Point clé : ce bloc n'est PAS scopé et les variables viennent de
 *    :root, donc le contenu téléporté dans <body> est stylé correctement.
 * ------------------------------------------------------------------ */
.pp-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(20, 38, 31, 0.55);
  backdrop-filter: blur(3px);
  overflow-y: auto;
}

.pp-modal {
  width: 100%;
  max-width: 34rem;
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  background: var(--pp-surface);
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-lg);
  box-shadow: var(--pp-shadow-lg);
  overflow: hidden;
}

.pp-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1.125rem;
  border-bottom: 1px solid var(--pp-border);
}
.pp-modal__title { margin: 0; font-size: var(--pp-text-lg); font-weight: 600; }
.pp-modal__sub { margin: 0.25rem 0 0; font-size: var(--pp-text-sm); color: var(--pp-ink-soft); }

.pp-modal__body { padding: 1.5rem; overflow-y: auto; }

.pp-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 1.125rem 1.5rem;
  border-top: 1px solid var(--pp-border);
  background: var(--pp-canvas);
}

.pp-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-sm);
  background: var(--pp-surface);
  color: var(--pp-ink-soft);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.pp-close:hover { background: var(--pp-canvas); color: var(--pp-ink); border-color: var(--pp-border-strong); }

/* Formulaires */
.pp-form { display: grid; gap: 1.125rem; }
.pp-field { display: grid; gap: 0.5rem; }
.pp-field-row { display: grid; gap: 1.125rem; }
@media (min-width: 520px) {
  .pp-field-row { grid-template-columns: 1fr 1fr; }
}

.pp-label {
  font-size: var(--pp-text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pp-ink-soft);
}

.pp-input {
  width: 100%;
  font-family: inherit;
  font-size: var(--pp-text-base);
  color: var(--pp-ink);
  background: var(--pp-surface);
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-sm);
  padding: 0.75rem 0.875rem;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.pp-input::placeholder { color: var(--pp-ink-faint); }
.pp-input:focus {
  border-color: var(--pp-primary);
  box-shadow: 0 0 0 3px var(--pp-primary-tint);
}
textarea.pp-input { resize: vertical; min-height: 6rem; line-height: 1.6; }
select.pp-input { appearance: none; background-image: none; cursor: pointer; }

.pp-success {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px solid var(--pp-primary);
  border-radius: var(--pp-radius-md);
  background: var(--pp-primary-tint);
  color: var(--pp-primary);
  font-size: var(--pp-text-sm);
  font-weight: 600;
}

.pp-error {
  margin: 0;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--pp-danger);
  border-radius: var(--pp-radius-sm);
  background: var(--pp-danger-tint);
  color: var(--pp-danger);
  font-size: var(--pp-text-sm);
}

/* Animations d'ouverture / fermeture */
.pp-modal-enter-active,
.pp-modal-leave-active { transition: opacity 0.2s ease; }
.pp-modal-enter-from,
.pp-modal-leave-to { opacity: 0; }

.pp-modal-enter-active .pp-modal { animation: pp-pop 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes pp-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .pp-offer:hover { transform: none; }
  .pp-modal-enter-active .pp-modal { animation: none; }
}
</style>