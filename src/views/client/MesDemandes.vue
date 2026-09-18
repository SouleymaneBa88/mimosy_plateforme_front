<script setup>
/**
 * MyRequests.vue
 * ------------------------------------------------------------------
 * Historique des demandes du client (prestations + devis), avec deux
 * modales : laisser un avis, consulter une facture.
 *
 * RÉSOLUTION DU PRESTATAIRE
 * ------------------------------------------------------------------
 * L'API renvoie `demande.prestataire` sous forme d'identifiant. Comme
 * pour le tableau de bord, on charge la liste des prestataires et on
 * indexe id -> profil pour afficher un nom plutôt qu'un identifiant
 * brut. L'identifiant original reste disponible séparément (besoin de
 * "refaireDemande", qui route vers /prestataire/:id).
 * ------------------------------------------------------------------
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import FilterTabs from '@/components/client/FilterTabs.vue'
import RequestCard from '@/components/client/RequestCard.vue'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'

const router = useRouter()
const demandeStore = useDemandePrestationStore()
const prestataireStore = usePrestataireStore()

/* ---------------------------------------------------------------- *
 * Résolution du prestataire (id -> nom lisible)
 * ---------------------------------------------------------------- */
function nomComplet(profile) {
  if (!profile) return ''
  const complet = [profile.user_first_name, profile.user_last_name].filter(Boolean).join(' ').trim()
  return complet || profile.nom_complet || profile.user_email || ''
}

const prestataireIndex = computed(() => {
  const index = new Map()
  prestataireStore.prestataires.forEach((profile) => {
    if (profile?.id !== undefined && profile?.id !== null) index.set(String(profile.id), profile)
  })
  return index
})

/**
 * Retrouve le profil derrière `demande.prestataire`.
 * Accepte un objet déjà sérialisé, un identifiant, ou des champs aplatis.
 */
function resoudrePrestataire(demande) {
  const reference = demande?.prestataire

  if (reference && typeof reference === 'object') return reference

  if (reference !== undefined && reference !== null && reference !== '') {
    const trouve = prestataireIndex.value.get(String(reference))
    if (trouve) return trouve
  }

  if (demande?.prestataire_nom || demande?.prestataire_user_first_name) {
    return {
      user_first_name: demande.prestataire_user_first_name,
      user_last_name: demande.prestataire_user_last_name,
      nom_complet: demande.prestataire_nom,
    }
  }

  return null
}

/* ---------------------------------------------------------------- *
 * Demandes normalisées
 * ---------------------------------------------------------------- */
const demandes = computed(() =>
  demandeStore.demandes.map((demande) => {
    const profile = resoudrePrestataire(demande)
    // L'identifiant brut du prestataire, conservé pour la navigation
    // (ex. router vers /prestataire/:id), distinct du nom affiché.
    const prestataireId = (profile && typeof demande.prestataire === 'object' ? profile.id : demande.prestataire) ?? null

    return {
      ...demande,
      statut:
        {
          EN_ATTENTE: 'en_cours',
          ACCEPTEE: 'en_cours',
          REFUSEE: 'annulee',
          TERMINEE: 'terminee',
          ANNULEE: 'annulee',
        }[demande.statut] || 'en_cours',
      titre: demande.description,
      prestataire: nomComplet(profile) || 'Prestataire non renseigné',
      prestataireId,
      date: demande.date_creation ? new Date(demande.date_creation).toLocaleString('fr-FR') : '',
      icon: '•',
      iconBackground: '#EAF8F2',
    }
  }),
)

const tabs = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'terminee', label: 'Terminées' },
  { id: 'annulee', label: 'Annulées' },
]

const activeTab = ref('toutes')

function chargerDonnees() {
  return Promise.all([
    demandeStore.chargerDemandes(),
    prestataireStore.chargerPrestataires(),
  ]).catch(() => {})
}

onMounted(chargerDonnees)

const demandesFiltrees = computed(() => {
  if (activeTab.value === 'toutes') {
    return demandes.value
  }

  return demandes.value.filter((demande) => demande.statut === activeTab.value)
})

function suivreDemande(id) {
  voirDetails(id)
}

function voirDetails(id) {
  if (!id) {
    return
  }

  router.push({
    name: 'detais.demande',
    params: { id: String(id) },
  })
}

function accepterDevis(id) {
  console.log('Accepter le devis', id)
}

function voirOffre(id) {
  console.log("Voir l'offre", id)
}

/**
 * --------------------------------------------------------------------------
 * MODAL AVIS
 * --------------------------------------------------------------------------
 */

const isAvisModalOpen = ref(false)

const demandeAvis = ref(null)

const noteAvis = ref(0)

const commentaireAvis = ref('')

/**
 * Ouvre le modal pour laisser un avis
 */
function laisserAvis(id) {
  const demande = demandes.value.find((item) => item.id === id)

  if (!demande) {
    return
  }

  demandeAvis.value = demande

  // Réinitialisation du formulaire
  noteAvis.value = 0
  commentaireAvis.value = ''

  isAvisModalOpen.value = true
}

/**
 * Ferme le modal
 */
function fermerAvis() {
  isAvisModalOpen.value = false
  demandeAvis.value = null
  noteAvis.value = 0
  commentaireAvis.value = ''
}

/**
 * Sélectionne une note
 */
function selectionnerNote(note) {
  noteAvis.value = note
}

/**
 * Envoie l'avis
 */
function envoyerAvis() {
  if (!demandeAvis.value) {
    return
  }

  if (noteAvis.value === 0) {
    return
  }

  if (!commentaireAvis.value.trim()) {
    return
  }

  const avis = {
    demandeId: demandeAvis.value.id,
    prestataire: demandeAvis.value.prestataire,
    note: noteAvis.value,
    commentaire: commentaireAvis.value.trim(),
  }

  /**
   * À remplacer plus tard par :
   *
   * POST /avis
   *
   * avec les données de l'avis.
   */
  console.log('Avis envoyé', avis)

  fermerAvis()
}

/**
 * --------------------------------------------------------------------------
 * MODAL FACTURE
 * --------------------------------------------------------------------------
 */

const isFactureModalOpen = ref(false)

// La demande dont on affiche la facture (contient .facture avec les lignes)
const demandeFacture = ref(null)

/**
 * Calcule le total de la facture à partir des lignes (quantité * prix unitaire).
 * Recalculé automatiquement si demandeFacture change grâce à computed().
 */
const totalFacture = computed(() => {
  if (!demandeFacture.value?.facture) return 0

  return demandeFacture.value.facture.lignes.reduce(
    (total, ligne) => total + ligne.quantite * ligne.prixUnitaire,
    0
  )
})

/**
 * Ouvre le modal facture pour la demande correspondante.
 */
function voirFacture(id) {
  const demande = demandes.value.find((item) => item.id === id)

  if (!demande || !demande.facture) {
    return
  }

  demandeFacture.value = demande
  isFactureModalOpen.value = true
}

/**
 * Ferme le modal facture et réinitialise l'état
 */
function fermerFacture() {
  isFactureModalOpen.value = false
  demandeFacture.value = null
}

function refaireDemande(id) {
  const demande = demandes.value.find((item) => item.id === id)

  // On route avec l'identifiant réel du prestataire, jamais avec le nom affiché.
  if (demande?.prestataireId) {
    router.push({
      name: 'client.prestataire',
      params: { id: demande.prestataireId },
      query: { refaire: 'true' },
    })
    return
  }

  router.push({ name: 'trouver-service', query: { refaire: 'true' } })
}

/**
 * --------------------------------------------------------------------------
 * Configuration des actions selon le statut
 * --------------------------------------------------------------------------
 */

const configParStatut = {
  en_cours: {
    badgeLabel: 'En cours',
    badgeBackground: '#EAF8F2',
    badgeColor: '#16805B',
    primaryLabel: 'Suivre',
    secondaryLabel: 'Détails',
    onPrimary: suivreDemande,
    onSecondary: voirDetails,
  },

  devis: {
    badgeLabel: 'Devis reçu',
    badgeBackground: '#EDF4FF',
    badgeColor: '#3267B1',
    primaryLabel: 'Accepter',
    secondaryLabel: "Voir l'offre",
    onPrimary: accepterDevis,
    onSecondary: voirOffre,
  },

  terminee: {
    badgeLabel: 'Terminée',
    badgeBackground: '#EAF8F2',
    badgeColor: '#16805B',
    primaryLabel: 'Détails',
    secondaryLabel: 'Détails',
    onPrimary: voirDetails,
    onSecondary: voirDetails,
  },

  annulee: {
    badgeLabel: 'Annulée',
    badgeBackground: '#FFF0EE',
    badgeColor: '#C53B35',
    primaryLabel: 'Refaire une demande',
    secondaryLabel: 'Détails',
    onPrimary: refaireDemande,
    onSecondary: voirDetails,
  },
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto flex w-full flex-col gap-7 sm:gap-8">
      <ClientHeader
        title="Mes demandes"
        subtitle="Gérez l'historique de vos demandes de services et devis."
      />

      <FilterTabs
        v-model="activeTab"
        :tabs="tabs"
      />

      <p v-if="demandeStore.isLoading" class="rounded-[20px] border border-[#E2E8F0] bg-white p-10 text-center text-[#64748B]">
        Chargement de vos demandes...
      </p>

      <p v-else-if="demandeStore.errorMessage" class="rounded-[20px] bg-[#FFF0EE] p-6 text-center text-[#A85148]">
        {{ demandeStore.errorMessage }}
      </p>

      <div v-else class="flex flex-col gap-4">
        <RequestCard
          v-for="demande in demandesFiltrees"
          :key="demande.id"
          :icon="demande.icon"
          :icon-background="demande.iconBackground"
          :title="demande.titre"
          :status-label="configParStatut[demande.statut].badgeLabel"
          :status-background="configParStatut[demande.statut].badgeBackground"
          :status-color="configParStatut[demande.statut].badgeColor"
          :meta="`Prestataire : ${demande.prestataire} • ${demande.date}`"
          :muted="demande.statut === 'terminee'"
          :primary-label="configParStatut[demande.statut].primaryLabel"
          :secondary-label="configParStatut[demande.statut].secondaryLabel"
          @primary-action="configParStatut[demande.statut].onPrimary(demande.id)"
          @secondary-action="configParStatut[demande.statut].onSecondary(demande.id)"
        >
          <!-- Suivi en cours : barre de progression -->
          <div
            v-if="demande.statut === 'en_cours'"
            class="flex items-center gap-3 pt-1"
          >
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#FAF5F0]">
              <div
                class="h-full rounded-full bg-[#2F6250]"
                :style="{ width: `${demande.progression}%` }"
              ></div>
            </div>

            <span class="shrink-0 text-xs text-[#64748B]">
              {{ demande.arrivee }}
            </span>
          </div>

          <!-- Devis reçu : montant proposé -->
          <p
            v-else-if="demande.statut === 'devis'"
            class="text-lg font-extrabold text-[#2F6250]"
          >
            {{ demande.prix.toLocaleString('fr-FR') }} FCFA
          </p>

          <!-- Terminée : montant déjà payé -->
          <p
            v-else-if="demande.statut === 'terminee' && demande.montantPaye != null"
            class="text-sm font-bold text-[#334155]"
          >
            {{ demande.montantPaye.toLocaleString('fr-FR') }} FCFA payés
          </p>
        </RequestCard>

        <div
          v-if="demandesFiltrees.length === 0"
          class="rounded-[20px] border border-dashed border-[#E2E8F0] bg-white p-10 text-center"
        >
          <p class="font-semibold text-[#051F20]">
            Aucune demande dans cette catégorie
          </p>

          <p class="mt-1 text-sm text-[#64748B]">
            Vos demandes apparaîtront ici une fois créées.
          </p>
        </div>
      </div>
    </div>

    <!-- ====================================================================
         MODAL LAISSER UN AVIS
         ==================================================================== -->

    <Teleport to="body">
      <Transition name="avis-modal">
        <div
          v-if="isAvisModalOpen"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-[#051F20]/50 px-4 py-6"
          @click.self="fermerAvis"
        >
          <div
            class="w-full max-w-[520px] rounded-[20px] bg-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avis-modal-title"
          >
            <!-- En-tête -->
            <div
              class="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-5 sm:px-6"
            >
              <div class="pr-4">
                <h2
                  id="avis-modal-title"
                  class="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#051F20]"
                >
                  Laisser un avis
                </h2>

                <p class="mt-1 text-sm text-[#64748B]">
                  Partagez votre expérience avec ce prestataire.
                </p>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xl text-[#64748B] transition hover:bg-[#F5F6F4] hover:text-[#051F20]"
                aria-label="Fermer"
                @click="fermerAvis"
              >
                ×
              </button>
            </div>

            <!-- Contenu -->
            <div class="px-5 py-5 sm:px-6 sm:py-6">
              <!-- Prestataire : nom, jamais l'identifiant -->
              <div
                v-if="demandeAvis"
                class="mb-6 rounded-[12px] bg-[#FAF5F0] px-4 py-3"
              >
                <p class="text-xs font-medium text-[#64748B]">
                  Prestataire
                </p>

                <p class="mt-1 text-sm font-bold text-[#051F20]">
                  {{ demandeAvis.prestataire }}
                </p>

                <p class="mt-1 text-xs text-[#64748B]">
                  {{ demandeAvis.titre }}
                </p>
              </div>

              <!-- Note -->
              <div>
                <p class="text-sm font-bold text-[#051F20]">
                  Votre note
                </p>

                <div
                  class="mt-3 flex items-center gap-2"
                  aria-label="Choisir une note sur 5"
                >
                  <button
                    v-for="note in 5"
                    :key="note"
                    type="button"
                    class="flex h-10 w-10 items-center justify-center text-2xl transition"
                    :class="
                      note <= noteAvis
                        ? 'text-[#A87545]'
                        : 'text-[#CBD5E1]'
                    "
                    :aria-label="`${note} étoile${note > 1 ? 's' : ''}`"
                    @click="selectionnerNote(note)"
                  >
                    ★
                  </button>
                </div>

                <p
                  v-if="noteAvis > 0"
                  class="mt-2 text-xs font-medium text-[#64748B]"
                >
                  {{ noteAvis }}/5
                </p>
              </div>

              <!-- Commentaire -->
              <div class="mt-6">
                <label
                  for="commentaire-avis"
                  class="text-sm font-bold text-[#051F20]"
                >
                  Votre commentaire
                </label>

                <textarea
                  id="commentaire-avis"
                  v-model="commentaireAvis"
                  rows="5"
                  maxlength="500"
                  placeholder="Décrivez votre expérience avec ce prestataire..."
                  class="mt-3 w-full resize-none rounded-[12px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#051F20] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2F6250]"
                ></textarea>

                <p class="mt-1 text-right text-xs text-[#94A3B8]">
                  {{ commentaireAvis.length }}/500
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div
              class="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] px-5 py-5 sm:flex-row sm:justify-end sm:px-6"
            >
              <button
                type="button"
                class="h-11 rounded-[10px] border border-[#E2E8F0] px-5 text-sm font-bold text-[#334155] transition hover:bg-[#F5F6F4]"
                @click="fermerAvis"
              >
                Annuler
              </button>

              <button
                type="button"
                class="h-11 rounded-[10px] bg-[#2F6250] px-5 text-sm font-bold text-white transition hover:bg-[#244B3D] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="noteAvis === 0 || !commentaireAvis.trim()"
                @click="envoyerAvis"
              >
                Publier mon avis
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ====================================================================
         MODAL FACTURE
         ==================================================================== -->

    <Teleport to="body">
      <Transition name="avis-modal">
        <div
          v-if="isFactureModalOpen"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-[#051F20]/50 px-4 py-6"
          @click.self="fermerFacture"
        >
          <div
            class="w-full max-w-[520px] rounded-[20px] bg-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="facture-modal-title"
          >
            <!-- En-tête -->
            <div class="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-5 sm:px-6">
              <div class="pr-4">
                <h2
                  id="facture-modal-title"
                  class="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#051F20]"
                >
                  Facture {{ demandeFacture?.facture.numero }}
                </h2>

                <p class="mt-1 text-sm text-[#64748B]">
                  {{ demandeFacture?.titre }}
                </p>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xl text-[#64748B] transition hover:bg-[#F5F6F4] hover:text-[#051F20]"
                aria-label="Fermer"
                @click="fermerFacture"
              >
                ×
              </button>
            </div>

            <!-- Contenu -->
            <div
              v-if="demandeFacture"
              class="px-5 py-5 sm:px-6 sm:py-6"
            >
              <!-- Infos prestataire / paiement -->
              <div class="mb-6 grid grid-cols-2 gap-4 rounded-[12px] bg-[#FAF5F0] px-4 py-3">
                <div>
                  <p class="text-xs font-medium text-[#64748B]">Prestataire</p>
                  <p class="mt-1 text-sm font-bold text-[#051F20]">
                    {{ demandeFacture.prestataire }}
                  </p>
                </div>

                <div>
                  <p class="text-xs font-medium text-[#64748B]">Mode de paiement</p>
                  <p class="mt-1 text-sm font-bold text-[#051F20]">
                    {{ demandeFacture.facture.modePaiement }}
                  </p>
                </div>

                <div>
                  <p class="text-xs font-medium text-[#64748B]">N° facture</p>
                  <p class="mt-1 text-sm font-bold text-[#051F20]">
                    {{ demandeFacture.facture.numero }}
                  </p>
                </div>
              </div>

              <!-- Détail des lignes -->
              <div>
                <p class="text-sm font-bold text-[#051F20]">Détail</p>

                <div class="mt-3 divide-y divide-[#E2E8F0] rounded-[12px] border border-[#E2E8F0]">
                  <div
                    v-for="(ligne, index) in demandeFacture.facture.lignes"
                    :key="index"
                    class="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p class="text-sm font-semibold text-[#051F20]">
                        {{ ligne.libelle }}
                      </p>
                      <p class="text-xs text-[#64748B]">
                        Qté : {{ ligne.quantite }}
                      </p>
                    </div>

                    <p class="text-sm font-bold text-[#334155]">
                      {{ (ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR') }} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-4">
                <p class="text-sm font-bold text-[#051F20]">Total payé</p>
                <p class="text-lg font-extrabold text-[#2F6250]">
                  {{ totalFacture.toLocaleString('fr-FR') }} FCFA
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end border-t border-[#E2E8F0] px-5 py-5 sm:px-6">
              <button
                type="button"
                class="h-11 rounded-[10px] bg-[#2F6250] px-5 text-sm font-bold text-white transition hover:bg-[#244B3D]"
                @click="fermerFacture"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<style scoped>
.avis-modal-enter-active,
.avis-modal-leave-active {
  transition: opacity 0.2s ease;
}

.avis-modal-enter-active > div,
.avis-modal-leave-active > div {
  transition: transform 0.2s ease;
}

.avis-modal-enter-from,
.avis-modal-leave-to {
  opacity: 0;
}

.avis-modal-enter-from > div,
.avis-modal-leave-to > div {
  transform: translateY(12px);
}
</style>