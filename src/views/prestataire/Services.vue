```vue
<!--
  Page "Mes prestations" du prestataire : la liste de ses offres de services
  (ajouter, modifier, supprimer), avec le prix et la disponibilité de chacune.
-->
<script setup>
// Outils Vue, icônes et routeur.
import { computed, onMounted, ref } from 'vue'
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Loader from '@/components/common/Loader.vue'
import ServiceModal from '@/components/prestataire/services/ServiceModal.vue'

// Les stores et les appels à l'API prestataire.
import { useCatalogueStore } from '@/stores/catalogue'
import { useAuthStore } from '@/stores/auth'
import * as prestataireService from '@/services/prestataireService'

// Le routeur et les stores.
const router = useRouter()
const catalogueStore = useCatalogueStore()
const authStore = useAuthStore()

/* -------------------------------------------------------------------------- */
/* État de la modale                                                          */
/* -------------------------------------------------------------------------- */

// La fenêtre d'ajout / modification : ouverte ? offre modifiée ? enregistrement ? erreur ?
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const modalError = ref('')

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

// Message affiché quand une offre est enregistrée mais pas encore visible.
const messageBrouillon = ref('')

/* -------------------------------------------------------------------------- */
/* Données                                                                     */
/* -------------------------------------------------------------------------- */

// La liste des offres, et les états de chargement et d'erreur.
const services = ref([])
const loading = ref(false)
const errorMessage = ref('')

/* -------------------------------------------------------------------------- */
/* Suppression                                                                 */
/* -------------------------------------------------------------------------- */

// Suppression : offre en attente de confirmation, offre en cours de suppression.
const confirmingId = ref(null)
const deletingId = ref(null)

/* -------------------------------------------------------------------------- */
/* Données calculées                                                           */
/* -------------------------------------------------------------------------- */

// Les services du catalogue (proposés dans la fenêtre).
const catalogue = computed(() => catalogueStore.services)

// Le nom du prestataire connecté.
const userName = computed(() => {
  const parts = [
    authStore.user?.first_name,
    authStore.user?.last_name,
  ].filter(Boolean)

  return parts.join(' ') || 'Prestataire'
})

// Texte du compteur d'offres (ex. "3 offres").
const countLabel = computed(() => {
  const total = services.value.length

  if (total === 0) return 'Aucune offre'
  if (total === 1) return '1 offre'

  return `${total} offres`
})

// Nombre d'offres disponibles, et nombre d'offres pas encore publiables.
const offresDisponibles = computed(() =>
  services.value.filter((service) => service.disponible).length,
)

const offresNonPubliees = computed(() =>
  services.value.filter((service) => !service.est_publiable).length,
)

/* -------------------------------------------------------------------------- */
/* Chargement                                                                  */
/* -------------------------------------------------------------------------- */

// Charge les offres du prestataire (et le catalogue).
async function chargerServices() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [, data] = await Promise.all([
      catalogueStore.chargerCatalogue(),
      prestataireService.listMyServiceOffers(),
    ])

    services.value = Array.isArray(data)
      ? data
      : data?.results || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// On charge au montage.
onMounted(chargerServices)

/* -------------------------------------------------------------------------- */
/* Création / modification                                                     */
/* -------------------------------------------------------------------------- */

// Ouvre la fenêtre (vide pour ajouter, remplie pour modifier).
function open(service = null) {
  editing.value = service
  modalError.value = ''
  showModal.value = true
}

// Enregistre l'offre (ajout ou modification).
async function save(payload) {
  saving.value = true
  modalError.value = ''
  messageBrouillon.value = ''

  try {
    const saved = editing.value
      ? await prestataireService.updateServiceOffer(
          editing.value.id,
          payload,
        )
      : await prestataireService.createServiceOffer(payload)

    const index = services.value.findIndex(
      (item) => item.id === saved.id,
    )

    if (index >= 0) {
      services.value[index] = saved
    } else {
      services.value.unshift(saved)
    }

    showModal.value = false

    if (!saved.est_publiable) {
      messageBrouillon.value =
        "Votre service a été enregistré. Pour le rendre visible aux clients, vous devez d'abord faire vérifier votre pièce d'identité par MIMOSY."
    }
  } catch (error) {
    modalError.value = error.message
  } finally {
    saving.value = false
  }
}

/* -------------------------------------------------------------------------- */
/* Suppression                                                                 */
/* -------------------------------------------------------------------------- */

// Demande confirmation avant de supprimer.
function askRemove(id) {
  errorMessage.value = ''
  confirmingId.value = id
}

// Annule la suppression.
function cancelRemove() {
  confirmingId.value = null
}

// Supprime l'offre après confirmation.
async function remove(id) {
  errorMessage.value = ''
  deletingId.value = id

  try {
    await prestataireService.deleteServiceOffer(id)

    services.value = services.value.filter(
      (service) => service.id !== id,
    )

    confirmingId.value = null
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    deletingId.value = null
  }
}

/* -------------------------------------------------------------------------- */
/* Formatage                                                                   */
/* -------------------------------------------------------------------------- */

// Met un prix au format "12 500 FCFA".
function formaterPrix(valeur) {
  return Number(valeur || 0).toLocaleString('fr-FR')
}

// Aller à la page du profil.
function allerAuProfil() {
  router.push('/prestataire/profil')
}
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <template #header>
      <hearderPrestataire />
    </template>
    <div class="mimosy-page">

      <!-- En-tête -->
      <!-- <ClientHeader
        title="Mes prestations"
        subtitle="Présentez les services que vous proposez."
        :user-name="userName"
        profile-path="/prestataire/profil"
      /> -->

      <main class="mimosy-content">

        <!-- Introduction -->
        <section class="page-intro">
          <div>
            <p class="page-eyebrow">
              Mon activité
            </p>

            <h1 class="page-title">
              Mes prestations
            </h1>

            <p class="page-description">
              Gérez les services que vous proposez aux clients sur MIMOSY.
            </p>
          </div>

          <button
            type="button"
            class="primary-button"
            @click="open()"
          >
            <Plus
              :size="18"
              stroke-width="2"
              aria-hidden="true"
            />

            <span>Ajouter un service</span>
          </button>
        </section>

        <!-- Résumé -->


        <!-- Message brouillon -->
        <div
          v-if="messageBrouillon"
          class="notice notice--warning"
          role="status"
        >
          <div class="notice-content">
            <AlertCircle
              :size="19"
              aria-hidden="true"
            />

            <p>
              {{ messageBrouillon }}
            </p>
          </div>

          <button
            type="button"
            class="notice-close"
            @click="messageBrouillon = ''"
          >
            Fermer
          </button>
        </div>

        <!-- Chargement -->
        <Loader v-if="loading" />

        <!-- Erreur -->
        <div
          v-else-if="errorMessage"
          class="notice notice--error"
          role="alert"
        >
          <div class="notice-content">
            <AlertCircle
              :size="19"
              aria-hidden="true"
            />

            <p>
              {{ errorMessage }}
            </p>
          </div>

          <button
            type="button"
            class="notice-close"
            @click="chargerServices"
          >
            Réessayer
          </button>
        </div>

        <!-- Aucun service -->
        <EmptyState
          v-else-if="!services.length"
          title="Aucune prestation"
          message="Ajoutez vos offres à partir du catalogue de services MIMOSY."
        />

        <!-- Liste -->
        <section
          v-else
          class="services-section"
        >
          <div class="section-heading">
            <div>
              <h2>
                Vos offres
              </h2>

              <p>
                Les services que les clients peuvent découvrir sur votre profil.
              </p>
            </div>


          </div>

          <div class="services-grid">

            <article
              v-for="service in services"
              :key="service.id"
              class="service-card"
            >

              <!-- En-tête carte -->
              <div class="service-card-header">

                <div class="service-card-title-area">
                  <p class="service-category">
                    {{ service.categorie_nom || 'Service MIMOSY' }}
                  </p>

                  <h3 class="service-title">
                    {{ service.service_nom }}
                  </h3>
                </div>

                <div class="service-statuses">

                  <span
                    class="status-badge"
                    :class="
                      service.disponible
                        ? 'status-badge--available'
                        : 'status-badge--unavailable'
                    "
                  >
                    <span class="status-dot"></span>

                    {{
                      service.disponible
                        ? 'Disponible'
                        : 'Indisponible'
                    }}
                  </span>

                  <span
                    v-if="!service.est_publiable"
                    class="status-badge status-badge--draft"
                  >
                    <span class="status-dot"></span>

                    Non publié
                  </span>

                </div>
              </div>

              <!-- Avertissement publication -->
              <div
                v-if="!service.est_publiable"
                class="draft-message"
              >
                <AlertCircle
                  :size="16"
                  aria-hidden="true"
                />

                <div>
                  <p>
                    Cette offre n'est pas encore visible par les clients.
                  </p>

                  <button
                    type="button"
                    @click="allerAuProfil"
                  >
                    Compléter mon profil
                  </button>
                </div>
              </div>

              <!-- Description -->
              <p
                class="service-description"
                :class="{
                  'service-description--empty': !service.description,
                }"
              >
                {{
                  service.description ||
                  'Aucune description renseignée.'
                }}
              </p>

              <!-- Prix -->
              <div class="service-price">
                <span class="price-value">
                  {{ formaterPrix(service.prix) }}
                </span>

                <span class="price-currency">
                  FCFA
                </span>

                <span class="price-unit">
                  / {{ service.unite }}
                </span>
              </div>

              <!-- Actions -->
              <div
                v-if="confirmingId !== service.id"
                class="service-actions"
              >
                <button
                  type="button"
                  class="secondary-button"
                  @click="open(service)"
                >
                  <Pencil
                    :size="15"
                    aria-hidden="true"
                  />

                  Modifier
                </button>

                <button
                  type="button"
                  class="danger-button"
                  @click="askRemove(service.id)"
                >
                  <Trash2
                    :size="15"
                    aria-hidden="true"
                  />

                  Supprimer
                </button>
              </div>

              <!-- Confirmation -->
              <div
                v-else
                class="delete-confirmation"
              >
                <div class="delete-confirmation-text">
                  <Trash2
                    :size="17"
                    aria-hidden="true"
                  />

                  <p>
                    Supprimer cette offre ?
                  </p>
                </div>

                <div class="service-actions">
                  <button
                    type="button"
                    class="secondary-button"
                    @click="cancelRemove"
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    class="danger-button danger-button--solid"
                    :disabled="deletingId === service.id"
                    @click="remove(service.id)"
                  >
                    {{
                      deletingId === service.id
                        ? 'Suppression…'
                        : 'Oui, supprimer'
                    }}
                  </button>
                </div>
              </div>

            </article>

          </div>
        </section>

      </main>

    </div>

    <!-- Modale création / édition -->
    <ServiceModal
      v-model="showModal"
      :service="editing"
      :catalogue="catalogue"
      :is-saving="saving"
      :error-message="modalError"
      @save="save"
    />
  </AppLayout>
</template>

<style scoped>
/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

.mimosy-page {
  min-height: 100%;
  background: #f2f3f0;
  color: #1a1c1a;
  font-family: 'DM Sans', Inter, system-ui, sans-serif;
}

.mimosy-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 10px;
}

/* -------------------------------------------------------------------------- */
/* Introduction                                                                */
/* -------------------------------------------------------------------------- */

.page-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.page-eyebrow {
  margin: 0 0 8px;
  color: #68716C;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  color: #1a1c1a;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 42px;
  font-weight: 400;
  line-height: 1;
}

.page-description {
  max-width: 620px;
  margin: 10px 0 0;
  color: #68716C;
  font-size: 15px;
  line-height: 24px;
}

/* -------------------------------------------------------------------------- */
/* Bouton principal                                                            */
/* -------------------------------------------------------------------------- */

.primary-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  border: 1px solid #2d6a4f;
  border-radius: 12px;
  background: #2d6a4f;
  padding: 0 18px;
  color: #fafaf8;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease;
}

.primary-button:hover {
  background: #24573f;
  border-color: #24573f;
}

.primary-button:focus-visible,
.secondary-button:focus-visible,
.danger-button:focus-visible,
.notice-close:focus-visible,
.draft-message button:focus-visible {
  outline: 2px solid #2d6a4f;
  outline-offset: 2px;
}

/* -------------------------------------------------------------------------- */
/* Résumé                                                                      */
/* -------------------------------------------------------------------------- */

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.summary-card {
  min-height: 145px;
  border: 1px solid #e5e7e2;
  border-radius: 20px;
  background: #fafaf8;
  padding: 20px;
}

.summary-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-label {
  color: #68716C;
  font-size: 13px;
  font-weight: 600;
}

.summary-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e2eae4;
  color: #2d6a4f;
}

.summary-icon > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.summary-icon--success {
  background: #d3eeeb;
  color: #1a978c;
}

.summary-icon--warning {
  background: #fbefcf;
  color: #8a5f00;
}

.summary-value {
  display: block;
  margin-top: 14px;
  color: #1a1c1a;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  line-height: 1;
}

.summary-description {
  margin: 8px 0 0;
  color: #68716C;
  font-size: 12px;
}

/* -------------------------------------------------------------------------- */
/* Notices                                                                     */
/* -------------------------------------------------------------------------- */

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  border: 1px solid #e5e7e2;
  border-radius: 16px;
  padding: 16px 18px;
  font-size: 14px;
}

.notice-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notice-content p {
  margin: 0;
  line-height: 22px;
}

.notice--warning {
  border-color: #eadba9;
  background: #fffaf0;
  color: #765c16;
}

.notice--error {
  border-color: #e7c2bd;
  background: #fff5f3;
  color: #8f342b;
}

.notice-close {
  flex-shrink: 0;
  border: 1px solid currentColor;
  border-radius: 9px;
  background: transparent;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

.services-section {
  margin-top: 8px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
  color: #1a1c1a;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 26px;
  font-weight: 400;
}

.section-heading p {
  margin: 5px 0 0;
  color: #68716C;
  font-size: 13px;
}

.section-count {
  display: inline-flex;
  min-width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e2eae4;
  color: #2d6a4f;
  font-size: 12px;
  font-weight: 700;
}

/* -------------------------------------------------------------------------- */
/* Grille des services                                                         */
/* -------------------------------------------------------------------------- */

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

/* -------------------------------------------------------------------------- */
/* Carte                                                                       */
/* -------------------------------------------------------------------------- */

.service-card {
  display: flex;
  min-width: 0;
  min-height: 340px;
  flex-direction: column;
  border: 1px solid #e5e7e2;
  border-radius: 20px;
  background: #fafaf8;
  padding: 20px;
  transition:
    border-color 180ms ease,
    background-color 180ms ease;
}

.service-card:hover {
  border-color: #b9c8bf;
  background: #ffffff;
}

.service-card:focus-within {
  border-color: #2d6a4f;
}

/* -------------------------------------------------------------------------- */
/* En-tête carte                                                               */
/* -------------------------------------------------------------------------- */

.service-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.service-card-title-area {
  min-width: 0;
}

.service-category {
  margin: 0 0 6px;
  color: #68716C;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.service-title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #1a1c1a;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 24px;
  font-weight: 400;
  line-height: 1.05;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.service-statuses {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--available {
  background: #d3eeeb;
  color: #176f68;
}

.status-badge--unavailable {
  background: #eef0ee;
  color: #69736d;
}

.status-badge--draft {
  background: #fbefcf;
  color: #8a6714;
}

/* -------------------------------------------------------------------------- */
/* Brouillon                                                                   */
/* -------------------------------------------------------------------------- */

.draft-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 16px;
  border-radius: 12px;
  background: #fff8e8;
  padding: 11px 12px;
  color: #765c16;
}

.draft-message p {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}

.draft-message button {
  margin-top: 3px;
  border: 0;
  background: transparent;
  padding: 0;
  color: #765c16;
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

/* -------------------------------------------------------------------------- */
/* Description                                                                 */
/* -------------------------------------------------------------------------- */

.service-description {
  display: -webkit-box;
  min-height: 72px;
  flex: 1;
  margin: 20px 0 0;
  overflow: hidden;
  color: #5e6862;
  font-size: 13px;
  line-height: 21px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.service-description--empty {
  color: #8a938d;
  font-style: italic;
}

/* -------------------------------------------------------------------------- */
/* Prix                                                                        */
/* -------------------------------------------------------------------------- */

.service-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 18px;
  border-top: 1px solid #e5e7e2;
  padding-top: 16px;
}

.price-value {
  color: #2d6a4f;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 28px;
  line-height: 1;
}

.price-currency {
  color: #2d6a4f;
  font-size: 12px;
  font-weight: 700;
}

.price-unit {
  color: #68716C;
  font-size: 12px;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

.service-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}

.secondary-button,
.danger-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.secondary-button {
  border: 1px solid #d9ddd8;
  background: #fafaf8;
  color: #39433e;
}

.secondary-button:hover {
  border-color: #b9c8bf;
  background: #e2eae4;
}

.danger-button {
  border: 1px solid #e7c2bd;
  background: transparent;
  color: #9a4037;
}

.danger-button:hover {
  background: #fff0ee;
}

.danger-button--solid {
  border-color: #a8443a;
  background: #a8443a;
  color: #ffffff;
}

.danger-button--solid:hover {
  border-color: #84352e;
  background: #84352e;
}

.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* -------------------------------------------------------------------------- */
/* Confirmation suppression                                                    */
/* -------------------------------------------------------------------------- */

.delete-confirmation {
  margin-top: 16px;
  border: 1px solid #e7c2bd;
  border-radius: 12px;
  background: #fff5f3;
  padding: 12px;
}

.delete-confirmation-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8f342b;
}

.delete-confirmation-text p {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}

.delete-confirmation .service-actions {
  margin-top: 10px;
}

/* -------------------------------------------------------------------------- */
/* Responsive                                                                  */
/* -------------------------------------------------------------------------- */

@media (max-width: 1100px) {
  .mimosy-content {
    padding: 32px;
  }

  .services-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .mimosy-content {
    padding: 24px 16px 32px;
  }

  .page-intro {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 36px;
  }

  .primary-button {
    width: 100%;
  }

  .services-grid {
    grid-template-columns: 1fr;
  }

  .service-card {
    min-height: 0;
  }

  .service-card-header {
    flex-direction: column;
  }

  .service-statuses {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .service-actions {
    grid-template-columns: 1fr;
  }

  .notice {
    align-items: stretch;
    flex-direction: column;
  }

  .notice-close {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mimosy-page * {
    transition: none !important;
  }
}
</style>
```
