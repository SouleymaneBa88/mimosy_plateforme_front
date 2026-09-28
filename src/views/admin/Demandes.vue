<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppLayout from '@/components/layout/AppLayout.vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Pagination from '@/components/common/Pagination.vue'

import { useAdminListe } from '@/composables/useAdminListe'
import * as adminService from '@/services/adminService'

const router = useRouter()

const {
  items: demandes,
  count,
  page,
  pageSize,
  loading,
  errorMessage,
  filtres,
  charger,
  rechercher,
  changerPage,
} = useAdminListe(adminService.listDemandesAdmin, {
  statut: '',
  date_debut: '',
  date_fin: '',
  recherche: '',
})

const statuts = [
  { valeur: '', label: 'Tous' },
  { valeur: 'EN_ATTENTE', label: 'En attente' },
  { valeur: 'ACCEPTEE', label: 'Acceptée' },
  { valeur: 'REALISEE', label: 'Validation en attente' },
  { valeur: 'TERMINEE', label: 'Terminée' },
  { valeur: 'ANNULEE', label: 'Annulée' },
]

const classeStatut = {
  EN_ATTENTE: 'bg-[#F2F3F0] text-[#1C2420]',
  ACCEPTEE: 'bg-[#2D6A4F] text-white',
  REALISEE: 'bg-[#FFF7E6] text-[#9A723C]',
  TERMINEE: 'bg-[#F2F3F0] text-[#1C2420]',
  REFUSEE: 'bg-[#FEE2E2] text-[#C0392B]',
  ANNULEE: 'bg-[#FEE2E2] text-[#C0392B]',
}

/* Liseré de couleur en haut de chaque carte, selon le statut */
const couleurLisere = {
  EN_ATTENTE: '#E6E8E3',
  ACCEPTEE: '#2D6A4F',
  REALISEE: '#C9A45C',
  TERMINEE: '#1C2420',
  REFUSEE: '#C0392B',
  ANNULEE: '#C0392B',
}

const libelleStatut = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  REALISEE: 'Validation en attente',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

let debounce = null

const statutActif = computed(() => filtres.statut)

const nombreAffiche = computed(() => demandes.value?.length ?? 0)

const debutAffichage = computed(() => {
  if (!count.value || !nombreAffiche.value) return 0
  return (page.value - 1) * pageSize.value + 1
})

const finAffichage = computed(() => {
  if (!count.value || !nombreAffiche.value) return 0
  return debutAffichage.value + nombreAffiche.value - 1
})

const totalPages = computed(() => {
  if (!count.value || !pageSize.value) return 1
  return Math.ceil(count.value / pageSize.value)
})

watch(
  () => filtres.recherche,
  () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      rechercher()
    }, 350)
  },
)

function selectionnerStatut(statut) {
  filtres.statut = statut
  rechercher()
}

function obtenirNomClient(demande) {
  return demande.client_nom || 'Client non renseigné'
}

function obtenirService(demande) {
  return demande.service_nom || 'Service non renseigné'
}

function aBudget(demande) {
  return (
    demande.budget !== null &&
    demande.budget !== undefined &&
    demande.budget !== '' &&
    !Number.isNaN(Number(demande.budget))
  )
}

function obtenirBudget(demande) {
  if (!aBudget(demande)) return '—'
  return `${Number(demande.budget).toLocaleString('fr-FR')} FCFA`
}

function formaterDate(date) {
  if (!date) return '—'
  const valeur = new Date(date)
  if (Number.isNaN(valeur.getTime())) return '—'
  return valeur.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenirInitiales(nom) {
  if (!nom) return '—'
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  if (!mots.length) return '—'
  return mots
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('')
}

function voirDemande(demande) {
  if (!demande?.id) return

  /*
   * Si ton router utilise un autre nom pour le détail,
   * il suffit de modifier cette route.
   */
  router.push({
    name: 'admin-demande-detail',
    params: { id: demande.id },
  })
}

function exporterCSV() {
  if (!demandes.value.length) return

  const colonnes = [
    'Référence',
    'Client',
    'Email client',
    'Prestataire',
    'Service',
    'Budget',
    'Statut',
    'Date',
  ]

  const lignes = demandes.value.map((demande) => [
    demande.id ?? '',
    demande.client_nom ?? '',
    demande.client_email ?? '',
    demande.prestataire_nom ?? '',
    demande.service_nom ?? '',
    demande.budget ?? '',
    libelleStatut[demande.statut] || demande.statut || '',
    demande.date_creation ?? '',
  ])

  const contenu = [colonnes, ...lignes]
    .map((ligne) =>
      ligne
        .map((valeur) => `"${String(valeur ?? '').replace(/"/g, '""')}"`)
        .join(';'),
    )
    .join('\n')

  const blob = new Blob([`\uFEFF${contenu}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = 'demandes-mimosy.csv'
  lien.click()
  URL.revokeObjectURL(url)
}

onMounted(charger)

onUnmounted(() => {
  clearTimeout(debounce)
})
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="w-full bg-[#FFFDF9] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <!-- ======================================================= -->
      <!-- EN-TÊTE                                                  -->
      <!-- ======================================================= -->

      <header class="mb-10">
        <h1
          class="font-serif text-[42px] font-normal leading-[1] tracking-tight text-[#1C2420] sm:text-[48px]"
        >
          Demandes
        </h1>

        <p class="mt-2 text-sm leading-6 text-[#7A847E] sm:text-base">
          Suivre les demandes de prestation de la plateforme en temps réel.
        </p>
      </header>

      <!-- ======================================================= -->
      <!-- FILTRES                                                  -->
      <!-- ======================================================= -->

      <section
        class="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between p-5"
      >
        <!-- Statuts -->
        <div class="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="statut in statuts"
            :key="statut.valeur"
            type="button"
            class="shrink-0 rounded-full px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition"
            :class="
              statutActif === statut.valeur
                ? 'bg-[#2D6A4F] text-white'
                : 'border border-[#E6E8E3] bg-transparent text-[#1C2420]/60 hover:border-[#2D6A4F] hover:text-[#2D6A4F]'
            "
            @click="selectionnerStatut(statut.valeur)"
          >
            {{ statut.label }}
          </button>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            v-model="filtres.recherche"
            type="search"
            placeholder="Rechercher..."
            aria-label="Rechercher une demande"
            class="h-10 w-full border border-[#E6E8E3] bg-[#FAFAF8] px-4 text-sm text-[#1C2420] outline-none placeholder:text-[#7A847E]/50 focus:border-[#2D6A4F] sm:w-[250px]"
          />

          <input
            v-model="filtres.date_debut"
            type="date"
            aria-label="Date de début"
            class="h-10 border border-[#E6E8E3] bg-[#FAFAF8] px-3 text-xs text-[#1C2420] outline-none focus:border-[#2D6A4F]"
            @change="rechercher"
          />

          <input
            v-model="filtres.date_fin"
            type="date"
            aria-label="Date de fin"
            class="h-10 border border-[#E6E8E3] bg-[#FAFAF8] px-3 text-xs text-[#1C2420] outline-none focus:border-[#2D6A4F]"
            @change="rechercher"
          />

          <button
            type="button"
            class="flex h-10 shrink-0 items-center justify-center gap-2 border border-[#E6E8E3] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#1C2420] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!demandes.length"
            @click="exporterCSV"
          >
            Exporter CSV
          </button>
        </div>
      </section>

      <!-- ======================================================= -->
      <!-- CHARGEMENT (cartes fantômes)                              -->
      <!-- ======================================================= -->

      <div
        v-if="loading"
        class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        aria-busy="true"
        aria-label="Chargement des demandes"
      >
        <div
          v-for="n in 8"
          :key="n"
          class="squelette h-[292px] border border-[#E6E8E3]"
        />
      </div>

      <!-- ======================================================= -->
      <!-- ERREUR                                                    -->
      <!-- ======================================================= -->

      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />

      <!-- ======================================================= -->
      <!-- AUCUNE DONNÉE                                             -->
      <!-- ======================================================= -->

      <EmptyState
        v-else-if="!demandes.length"
        title="Aucune demande trouvée"
        message="Aucune demande ne correspond à ces critères."
      />

      <!-- ======================================================= -->
      <!-- CARTES                                                    -->
      <!-- ======================================================= -->

      <template v-else>
        <section
          class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mx-5"
          aria-label="Liste des demandes"
        >
          <article
            v-for="demande in demandes"
            :key="demande.id"
            class="carte group relative flex cursor-pointer flex-col border border-[#E6E8E3] bg-[#FAFAF8] transition-colors duration-200 hover:border-[#2D6A4F]"
            tabindex="0"
            :aria-label="`Demande #${demande.id} — ${obtenirService(demande)}`"
            @click="voirDemande(demande)"
            @keydown.enter="voirDemande(demande)"
          >
            <!-- Liseré de statut -->
            <span
              class="absolute inset-x-0 top-0 h-[2px]"
              :style="{ backgroundColor: couleurLisere[demande.statut] || '#E6E8E3' }"
              aria-hidden="true"
            />

            <!-- Haut : référence + statut -->
            <div class="flex items-center justify-between gap-3 px-6 pt-6">
              <span class="font-mono text-xs text-[#7A847E]">#{{ demande.id }}</span>

              <span
                class="inline-flex rounded-sm px-3 py-1 text-[10px] font-bold uppercase tracking-[0.04em]"
                :class="classeStatut[demande.statut] || 'bg-[#F2F3F0] text-[#1C2420]'"
              >
                {{ libelleStatut[demande.statut] || demande.statut || 'Inconnu' }}
              </span>
            </div>

            <!-- Service + budget -->
            <div class="px-6 pb-6 pt-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C2420]/45">
                Service
              </p>
              <h2
                class="mt-1.5 line-clamp-2 min-h-[56px] font-serif text-[22px] font-normal leading-7 text-[#1C2420]"
                :title="obtenirService(demande)"
              >
                {{ obtenirService(demande) }}
              </h2>

              <p
                class="mt-3 text-sm"
                :class="aBudget(demande) ? 'font-medium text-[#2D6A4F]' : 'text-[#1C2420]/35'"
              >
                {{ aBudget(demande) ? obtenirBudget(demande) : 'Budget non précisé' }}
              </p>
            </div>

            <!-- Client / prestataire -->
            <div class="flex flex-col gap-4 border-t border-[#E6E8E3] px-6 py-5">
              <!-- Client -->
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6E8E3] bg-[#F2F3F0] text-[10px] font-bold text-[#2D6A4F]"
                  aria-hidden="true"
                >
                  {{ obtenirInitiales(obtenirNomClient(demande)) }}
                </div>

                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C2420]/40">
                    Client
                  </p>
                  <p class="truncate text-sm font-medium text-[#1C2420]">
                    {{ obtenirNomClient(demande) }}
                  </p>
                  <p
                    v-if="demande.client_email"
                    class="truncate text-xs text-[#7A847E]"
                    :title="demande.client_email"
                  >
                    {{ demande.client_email }}
                  </p>
                </div>
              </div>

              <!-- Prestataire -->
              <div class="flex min-w-0 items-center gap-3">
                <div
                  v-if="demande.prestataire_nom"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2D6A4F] bg-[#2D6A4F] text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {{ obtenirInitiales(demande.prestataire_nom) }}
                </div>
                <div
                  v-else
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[#1C2420]/25 text-[12px] text-[#1C2420]/30"
                  aria-hidden="true"
                >
                  ?
                </div>

                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C2420]/40">
                    Prestataire
                  </p>
                  <p
                    v-if="demande.prestataire_nom"
                    class="truncate text-sm font-medium text-[#1C2420]"
                  >
                    {{ demande.prestataire_nom }}
                  </p>
                  <p v-else class="text-sm italic text-[#1C2420]/40">Non assigné</p>
                </div>
              </div>
            </div>

            <!-- Pied : date + action -->
            <div
              class="mt-auto flex items-center justify-between gap-3 border-t border-[#E6E8E3] px-6 py-4"
            >
              <span class="whitespace-nowrap text-xs text-[#1C2420]/60">
                {{ formaterDate(demande.date_creation) }}
              </span>

              <button
                type="button"
                class="border-b border-[#1C2420] pb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1C2420] transition group-hover:border-[#2D6A4F] group-hover:text-[#2D6A4F]"
                @click.stop="voirDemande(demande)"
              >
                Voir
              </button>
            </div>
          </article>
        </section>

        <!-- ===================================================== -->
        <!-- PAGINATION                                             -->
        <!-- ===================================================== -->

        <footer
          class="mt-8 flex flex-col gap-5 border border-[#E6E8E3] bg-[#FAFAF8] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-col gap-1">
            <p class="text-xs text-[#1C2420]/50">
              Affichage de
              <span v-if="count">{{ debutAffichage }}-{{ finAffichage }}</span>
              <span v-else>0</span>
              sur {{ count }} demande{{ count > 1 ? 's' : '' }}
            </p>
            <p
              v-if="totalPages > 1"
              class="text-[10px] uppercase tracking-[0.12em] text-[#7A847E]/60"
            >
              Page {{ page }} sur {{ totalPages }}
            </p>
          </div>

          <Pagination
            :page="page"
            :count="count"
            :page-size="pageSize"
            @update:page="changerPage"
          />
        </footer>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.carte:focus-visible {
  outline: 2px solid #2d6a4f;
  outline-offset: 2px;
}

.squelette {
  background: linear-gradient(100deg, #fafaf8 30%, #f2f3f0 50%, #fafaf8 70%);
  background-size: 300% 100%;
  animation: reflet 1.6s ease-in-out infinite;
}

@keyframes reflet {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .squelette {
    animation: none;
  }
}
</style>