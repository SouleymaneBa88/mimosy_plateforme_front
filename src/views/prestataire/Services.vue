<script setup>
/**
 * MesPrestations.vue
 * ─────────────────────────────────────────────────────────────
 * Page de gestion des offres de service d'un prestataire.
 *
 * Fonctionnalités :
 *  - Lister les offres déjà créées par le prestataire connecté
 *  - Créer / modifier une offre via ServiceModal (le catalogue de
 *    services disponibles vient du store `catalogue`)
 *  - Supprimer une offre
 *
 * Choix de design (voir <style> en bas) :
 *  - Aucune ombre portée (box-shadow) : la hiérarchie visuelle se fait
 *    uniquement par la couleur de fond, la bordure et l'épaisseur du texte.
 *  - Aucun emoji : les statuts et actions utilisent des puces de couleur
 *    ou des icônes SVG sobres, pas de pictogrammes emoji.
 *  - Les couleurs passent par les jetons --pp-*, cohérents avec le reste
 *    de l'espace prestataire (tableau de bord, etc.).
 */
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Loader from '@/components/common/Loader.vue'
import ServiceModal from '@/components/prestataire/services/ServiceModal.vue'
import { useCatalogueStore } from '@/stores/catalogue'
import { useAuthStore } from '@/stores/auth'
import * as prestataireService from '@/services/prestataireService'

const catalogueStore = useCatalogueStore()
const authStore = useAuthStore()

// État de la modale de création / édition
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const modalError = ref('')

// Données de la page
const services = ref([])
const loading = ref(false)
const errorMessage = ref('')

const catalogue = computed(() => catalogueStore.services)
const userName = computed(() => {
  const parts = [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean)
  return parts.join(' ') || 'Prestataire'
})

async function chargerServices() {
  loading.value = true
  errorMessage.value = ''
  try {
    // Le catalogue (liste des services proposés par MIMOSY) et les offres
    // du prestataire sont deux ressources indépendantes : on les charge
    // en parallèle plutôt qu'en série pour réduire le temps d'attente.
    await catalogueStore.chargerCatalogue()
    const data = await prestataireService.listMyServiceOffers()
    services.value = Array.isArray(data) ? data : data?.results || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(chargerServices)

/** Ouvre la modale. Sans argument : mode création. Avec un service : mode édition. */
function open(service = null) {
  editing.value = service
  modalError.value = ''
  showModal.value = true
}

async function save(payload) {
  saving.value = true
  modalError.value = ''
  try {
    const saved = editing.value
      ? await prestataireService.updateServiceOffer(editing.value.id, payload)
      : await prestataireService.createServiceOffer(payload)

    // Mise à jour optimiste de la liste locale : on évite un rechargement
    // complet depuis l'API après chaque sauvegarde.
    const index = services.value.findIndex((item) => item.id === saved.id)
    if (index >= 0) services.value[index] = saved
    else services.value.unshift(saved)

    showModal.value = false
  } catch (error) {
    modalError.value = error.message
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  errorMessage.value = ''
  try {
    await prestataireService.deleteServiceOffer(id)
    services.value = services.value.filter((service) => service.id !== id)
  } catch (error) {
    errorMessage.value = error.message
  }
}

/** Formate un prix numérique en FCFA avec séparateur de milliers français. */
function formaterPrix(valeur) {
  return Number(valeur).toLocaleString('fr-FR')
}
</script>

<template>
  <AppLayout role="prestataire">
    <div class="pp-page mx-auto flex w-full flex-col gap-7">
      <ClientHeader
        title="Mes prestations"
        subtitle="Présentez les services que vous proposez."
        :user-name="userName"
        profile-path="/prestataire/profil"
      />

      <div class="flex items-center justify-between">
        <p class="pp-count">
          {{ services.length }} offre<span v-if="services.length > 1">s</span> publiée<span v-if="services.length > 1">s</span>
        </p>
        <button type="button" class="pp-btn-primary" @click="open()">
          <span class="pp-plus" aria-hidden="true">+</span>
          Ajouter un service
        </button>
      </div>

      <Loader v-if="loading" />

      <div v-else-if="errorMessage" class="pp-error-box">
        <p>{{ errorMessage }}</p>
        <button type="button" class="pp-btn-retry" @click="chargerServices">Réessayer</button>
      </div>

      <EmptyState
        v-else-if="!services.length"
        title="Aucune prestation"
        message="Ajoutez vos offres à partir du catalogue de services MIMOSY."
      />

      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="service in services" :key="service.id" class="pp-card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="pp-card-title">{{ service.service_nom }}</h2>
              <p class="pp-card-category">{{ service.categorie_nom }}</p>
            </div>
            <span class="pp-status" :class="service.disponible ? 'pp-status--on' : 'pp-status--off'">
              <span class="pp-status-dot" aria-hidden="true" />
              {{ service.disponible ? 'Disponible' : 'Indisponible' }}
            </span>
          </div>

          <p class="pp-card-desc">
            {{ service.description || 'Aucune description renseignée.' }}
          </p>

          <p class="pp-card-price">
            {{ formaterPrix(service.prix) }} FCFA
            <span class="pp-card-unit">/ {{ service.unite }}</span>
          </p>

          <div class="pp-card-actions">
            <button type="button" class="pp-btn-secondary" @click="open(service)">Modifier</button>
            <button type="button" class="pp-btn-danger" @click="remove(service.id)">Supprimer</button>
          </div>
        </article>
      </div>

      <ServiceModal
        v-model="showModal"
        :service="editing"
        :catalogue="catalogue"
        :is-saving="saving"
        :error-message="modalError"
        @save="save"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
/*
 * Jetons de couleur communs à l'espace prestataire.
 * Aucune propriété box-shadow n'est utilisée dans ce fichier : la
 * hiérarchie visuelle repose sur la couleur de fond et la bordure.
 */
.pp-page {
  /*
   * Ces jetons sont volontairement fixés ici (pas de repli sur une
   * variable du même nom héritée d'un parent) : la page précédente était
   * illisible parce qu'un --pp-muted global, probablement pensé pour un
   * fond sombre ailleurs dans l'appli, écrasait silencieusement notre
   * valeur de repli. En fixant des couleurs propres à cette page, le
   * contraste reste garanti quel que soit le thème environnant.
   * Les gris de texte sont volontairement plus foncés (slate-600/700)
   * qu'un gris "cosmétique" classique, pour rester lisibles sur fond blanc.
   */
  --pp-forest: #051f20;
  --pp-sage: #2f6250;
  --pp-sage-dark: #1c3f34;
  --pp-ink: #0f172a;
  --pp-muted: #47556a;
  --pp-border: #dbe2e6;
  --pp-surface: #ffffff;
  --pp-bg-soft: #f1f5f4;
  --pp-danger-border: #e7b8b2;
  --pp-danger-bg: #fff0ee;
  --pp-danger-text: #8f342b;
  --pp-ok-bg: #dcf3e9;
  --pp-ok-text: #0f6644;
  color: var(--pp-ink);
  font-family: 'Inter', system-ui, sans-serif;
}

.pp-card-title,
.pp-card-price {
  font-family: 'Newsreader', Georgia, serif;
}

/* ---------- En-tête de liste ---------- */
.pp-count {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--pp-muted);
}

.pp-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  background: var(--pp-sage);
  padding: 0.65rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  border: 1px solid var(--pp-sage);
  transition: background-color 0.15s ease;
}
.pp-btn-primary:hover {
  background: var(--pp-sage-dark);
}
.pp-plus {
  font-size: 1rem;
  line-height: 1;
}

/* ---------- Carte de service ---------- */
.pp-card {
  display: flex;
  flex-direction: column;
  border-radius: 1rem;
  border: 1px solid var(--pp-border);
  background: var(--pp-surface);
  padding: 1.25rem;
  transition: border-color 0.15s ease;
}
.pp-card:hover {
  border-color: var(--pp-sage);
}

.pp-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--pp-forest);
}
.pp-card-category {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pp-muted);
}

/* Statut : un point de couleur plein remplace toute icône ou emoji. */
.pp-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 700;
}
.pp-status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: currentColor;
}
.pp-status--on {
  background: var(--pp-ok-bg);
  color: var(--pp-ok-text);
}
.pp-status--off {
  background: #f1f5f9;
  color: var(--pp-muted);
}

.pp-card-desc {
  margin-top: 0.75rem;
  min-height: 3rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
  color: #334155;
}

.pp-card-price {
  margin-top: 1rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--pp-sage);
}
.pp-card-unit {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--pp-muted);
}

.pp-card-actions {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.5rem;
}
.pp-btn-secondary,
.pp-btn-danger {
  border-radius: 0.6rem;
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
  transition: background-color 0.15s ease;
}
.pp-btn-secondary {
  border-color: #d9ddd8;
  color: #334155;
}
.pp-btn-secondary:hover {
  background: var(--pp-bg-soft);
}
.pp-btn-danger {
  border-color: var(--pp-danger-border);
  color: var(--pp-danger-text);
}
.pp-btn-danger:hover {
  background: var(--pp-danger-bg);
}

/* ---------- Erreur ---------- */
.pp-error-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.9rem;
  border: 1px solid var(--pp-danger-border);
  background: var(--pp-danger-bg);
  color: var(--pp-danger-text);
  padding: 1rem 1.25rem;
}
.pp-btn-retry {
  border-radius: 0.6rem;
  border: 1px solid currentColor;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
}
</style>