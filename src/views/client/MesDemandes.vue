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

// Outils Vue et routeur.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Les icônes des statistiques.
import { Inbox, Clock, CheckCircle2, XCircle } from 'lucide-vue-next'

// Les composants, les stores et l'abonnement au temps réel.
import ClientLayout from '@/components/layout/ClientLayout.vue'
import RequestCard from '@/components/client/RequestCard.vue'
import { useDemandePrestationStore } from '@/stores/demandePrestation'
import { usePrestataireStore } from '@/stores/prestataire'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'

// Le routeur et les stores des demandes et des prestataires.
const router = useRouter()
const demandeStore = useDemandePrestationStore()
const prestataireStore = usePrestataireStore()

/* ---------------------------------------------------------------- *
 * Résolution du prestataire (id -> nom lisible)
 * ---------------------------------------------------------------- */

/**
 * Construit un nom affichable à partir d'un profil prestataire.
 * Ordre de repli : prénom+nom → nom_complet → email → chaîne vide.
 * @param {object|null} profile
 * @returns {string}
 */
function nomComplet(profile) {
  if (!profile) return ''
  const complet = [profile.user_first_name, profile.user_last_name].filter(Boolean).join(' ').trim()
  return complet || profile.nom_complet || profile.user_email || ''
}

/**
 * Index Map(id → profil) construit une seule fois par changement de liste,
 * pour retrouver un prestataire en O(1) plutôt qu'avec un .find() répété.
 */
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
 * @param {object} demande
 * @returns {object|null}
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

/**
 * Transforme les demandes brutes du store en objets prêts à afficher :
 * statut regroupé (en_cours / terminee / annulee), nom du prestataire
 * résolu, date formatée, et identifiant brut du prestataire conservé
 * séparément pour la navigation.
 */
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
          REALISEE: 'en_cours',
          REFUSEE: 'annulee',
          TERMINEE: 'terminee',
          ANNULEE: 'annulee',
        }[demande.statut] || 'en_cours',
      titre: demande.description,
      prestataire: nomComplet(profile) || 'Prestataire non renseigné',
      prestataireId,
      date: demande.date_creation ? new Date(demande.date_creation).toLocaleString('fr-FR') : '',
      icon: '•',
      iconBackground: 'var(--color-mimosy-primaryBg)',
    }
  }),
)

/** Compte les demandes normalisées correspondant à un statut donné (ou toutes). */
function compterParFiltre(valeur) {
  if (valeur === 'toutes') return demandes.value.length
  return demandes.value.filter((demande) => demande.statut === valeur).length
}

/** Tuiles de statistiques (reprises de front_mimosy/StatistiquesDemandes.vue), calculées à partir des vraies demandes. */
const statistiques = computed(() => [
  { id: 'total', label: 'Total', valeur: demandes.value.length, icone: Inbox, fond: 'var(--color-mimosy-page)', texte: 'var(--color-mimosy-text)' },
  { id: 'en_cours', label: 'En cours', valeur: compterParFiltre('en_cours'), icone: Clock, fond: 'var(--color-mimosy-page)', texte: 'var(--color-mimosy-secondary)' },
  { id: 'terminee', label: 'Terminées', valeur: compterParFiltre('terminee'), icone: CheckCircle2, fond: 'var(--color-mimosy-primaryBg)', texte: 'var(--color-mimosy-primary)' },
  { id: 'annulee', label: 'Annulées', valeur: compterParFiltre('annulee'), icone: XCircle, fond: '#FFF0EE', texte: '#C53B35' },
])

/** Onglets de filtrage affichés au-dessus de la liste, avec compteurs réels. */
const tabs = computed(() => [
  { id: 'toutes', label: 'Toutes', nombre: compterParFiltre('toutes') },
  { id: 'en_cours', label: 'En cours', nombre: compterParFiltre('en_cours') },
  { id: 'terminee', label: 'Terminées', nombre: compterParFiltre('terminee') },
  { id: 'annulee', label: 'Annulées', nombre: compterParFiltre('annulee') },
])

/** Onglet actuellement sélectionné. */
const activeTab = ref('toutes')

/** Charge en parallèle les demandes et les prestataires au montage. */
function chargerDonnees() {
  return Promise.all([
    demandeStore.chargerDemandes(),
    prestataireStore.chargerPrestataires(),
  ]).catch(() => {})
}

// On charge au montage, et on recharge quand une demande est créée ou change de statut.
onMounted(chargerDonnees)
useEvenementTempsReel(['demande.nouvelle', 'demande.statut'], () => demandeStore.chargerDemandes(true))

/** Liste affichée : toutes les demandes, ou seulement celles de l'onglet actif. */
const demandesFiltrees = computed(() => {
  if (activeTab.value === 'toutes') {
    return demandes.value
  }

  return demandes.value.filter((demande) => demande.statut === activeTab.value)
})

/** Action "Suivre" (alias de voirDetails, gardé distinct pour la lisibilité des configs). */
function suivreDemande(id) {
  voirDetails(id)
}

/** Navigue vers la page de détail d'une demande. */
function voirDetails(id) {
  if (!id) {
    return
  }

  router.push({
    name: 'detais.demande',
    params: { id: String(id) },
  })
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

/** Ouvre le modal facture pour la demande correspondante. */
function voirFacture(id) {
  const demande = demandes.value.find((item) => item.id === id)

  if (!demande || !demande.facture) {
    return
  }

  demandeFacture.value = demande
  isFactureModalOpen.value = true
}

/** Ferme le modal facture et réinitialise l'état. */
function fermerFacture() {
  isFactureModalOpen.value = false
  demandeFacture.value = null
}

/** Relance une demande annulée : vers le prestataire d'origine, ou vers la recherche. */
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

  router.push({ name: 'client-prestataires', query: { refaire: 'true' } })
}

/**
 * --------------------------------------------------------------------------
 * Configuration des actions selon le statut
 * --------------------------------------------------------------------------
 * Centralise, pour chaque statut affiché, le libellé et la couleur du badge
 * ainsi que les deux actions du RequestCard (primaire / secondaire).
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
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[100%] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <!-- En-tête (repris de front_mimosy/views/clients/MesDemandes.vue) -->
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px] sm:leading-[38px]">Mes demandes</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Gérez et suivez l'avancement de vos demandes de services.</p>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div v-for="stat in statistiques" :key="stat.id" class="flex items-center gap-3 rounded-2xl border border-mimosy-border bg-mimosy-surface p-4 sm:p-5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :style="{ backgroundColor: stat.fond }">
            <component :is="stat.icone" :size="20" :stroke-width="1.8" :style="{ color: stat.texte }" />
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="font-serif text-2xl leading-7 text-mimosy-text">{{ stat.valeur }}</span>
            <span class="truncate font-sans text-[11px] font-bold uppercase leading-4 tracking-[0.4px] text-mimosy-secondary">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Onglets à compteurs : défilement horizontal si trop étroit -->
      <div class="-mx-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-bold transition"
          :class="activeTab === tab.id ? 'bg-mimosy-text text-white' : 'border border-mimosy-border bg-mimosy-surface text-mimosy-text hover:border-mimosy-primary hover:text-mimosy-primary'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span class="rounded-full px-1.5 py-0.5 text-[11px] leading-none" :class="activeTab === tab.id ? 'bg-white/15 text-white' : 'bg-mimosy-page text-mimosy-secondary'">
            {{ tab.nombre }}
          </span>
        </button>
      </div>

      <!-- ═══════════════ État : chargement ═══════════════ -->
      <div
        v-if="demandeStore.isLoading"
        class="flex flex-col gap-4"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="h-24 animate-pulse rounded-[20px] border border-mimosy-border bg-mimosy-page sm:h-28"
        ></div>
      </div>

      <!-- ═══════════════ État : erreur ═══════════════ -->
      <p
        v-else-if="demandeStore.errorMessage"
        class="rounded-[20px] bg-[#FFF0EE] p-6 text-center text-sm font-semibold text-[#A85148] sm:p-10"
      >
        {{ demandeStore.errorMessage }}
      </p>

      <!-- ═══════════════ Liste des demandes (grille en vagues) ═══════════════ -->
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RequestCard
          v-for="(demande, index) in demandesFiltrees"
          :key="demande.id"
          class="transition-transform duration-300"
          :class="index % 2 === 1 ? 'sm:mt-10' : ''"
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
          <!-- Budget réel de la demande (seule donnée de montant réellement fournie par l'API à ce stade). -->
          <p v-if="demande.budget" class="font-sans text-sm font-bold text-mimosy-primary">
            {{ Number(demande.budget).toLocaleString('fr-FR') }} FCFA
          </p>
        </RequestCard>

        <!-- ═══════════════ État : liste vide ═══════════════ -->
        <div
          v-if="demandesFiltrees.length === 0"
          class="col-span-full rounded-[24px] border border-dashed border-mimosy-border bg-mimosy-surface p-8 text-center sm:p-10"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mimosy-page text-mimosy-secondary"
          >
            <Inbox class="h-6 w-6" />
          </div>

          <p class="font-sans font-semibold text-mimosy-text">
            Aucune demande dans cette catégorie
          </p>

          <p class="mt-1 font-sans text-sm text-mimosy-secondary">
            Vos demandes apparaîtront ici une fois créées.
          </p>
        </div>
      </div>
    </div>

    <!-- ====================================================================
         MODAL FACTURE
         ==================================================================== -->

    <Teleport to="body">
      <Transition name="avis-modal">
        <div
          v-if="isFactureModalOpen"
          class="fixed inset-0 z-[1000] flex items-center justify-center bg-mimosy-text/55 px-4 py-6"
          @click.self="fermerFacture"
        >
          <div
            class="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-y-auto rounded-[24px] bg-mimosy-surface"
            role="dialog"
            aria-modal="true"
            aria-labelledby="facture-modal-title"
          >
            <!-- En-tête -->
            <div class="flex items-start justify-between border-b border-mimosy-border px-5 py-5 sm:px-6">
              <div class="pr-4">
                <h2
                  id="facture-modal-title"
                  class="font-serif text-xl text-mimosy-text"
                >
                  Facture {{ demandeFacture?.facture.numero }}
                </h2>

                <p class="mt-1 font-sans text-sm text-mimosy-secondary">
                  {{ demandeFacture?.titre }}
                </p>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-mimosy-secondary transition hover:bg-mimosy-page hover:text-mimosy-text"
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
              <!-- Infos prestataire / paiement : empilées sur mobile, 3 colonnes dès sm -->
              <div class="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-mimosy-page px-4 py-3 sm:grid-cols-3">
                <div>
                  <p class="font-sans text-xs font-medium text-mimosy-secondary">Prestataire</p>
                  <p class="mt-1 font-sans text-sm font-bold text-mimosy-text">
                    {{ demandeFacture.prestataire }}
                  </p>
                </div>

                <div>
                  <p class="font-sans text-xs font-medium text-mimosy-secondary">Mode de paiement</p>
                  <p class="mt-1 font-sans text-sm font-bold text-mimosy-text">
                    {{ demandeFacture.facture.modePaiement }}
                  </p>
                </div>

                <div>
                  <p class="font-sans text-xs font-medium text-mimosy-secondary">N° facture</p>
                  <p class="mt-1 font-sans text-sm font-bold text-mimosy-text">
                    {{ demandeFacture.facture.numero }}
                  </p>
                </div>
              </div>

              <!-- Détail des lignes -->
              <div>
                <p class="font-sans text-sm font-bold text-mimosy-text">Détail</p>

                <div class="mt-3 divide-y divide-mimosy-border rounded-xl border border-mimosy-border">
                  <div
                    v-for="(ligne, index) in demandeFacture.facture.lignes"
                    :key="index"
                    class="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-sans text-sm font-semibold text-mimosy-text">
                        {{ ligne.libelle }}
                      </p>
                      <p class="font-sans text-xs text-mimosy-secondary">
                        Qté : {{ ligne.quantite }}
                      </p>
                    </div>

                    <p class="shrink-0 font-sans text-sm font-bold text-mimosy-text">
                      {{ (ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR') }} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="mt-4 flex items-center justify-between border-t border-mimosy-border pt-4">
                <p class="font-sans text-sm font-bold text-mimosy-text">Total payé</p>
                <p class="font-sans text-lg font-extrabold text-mimosy-primary">
                  {{ totalFacture.toLocaleString('fr-FR') }} FCFA
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end border-t border-mimosy-border px-5 py-5 sm:px-6">
              <button
                type="button"
                class="h-11 rounded-xl bg-mimosy-primary px-5 font-sans text-sm font-bold text-white transition hover:opacity-90"
                @click="fermerFacture"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientLayout>
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

@media (prefers-reduced-motion: reduce) {
  .avis-modal-enter-active,
  .avis-modal-leave-active,
  .avis-modal-enter-active > div,
  .avis-modal-leave-active > div {
    transition: none;
  }
}
</style>