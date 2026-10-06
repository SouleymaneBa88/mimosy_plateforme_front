<!--
  Vérifications des prestataires (/admin/dossiers).

  Point d'entrée unique de la vérification : indicateurs par statut,
  filtres, recherche, et la liste des dossiers. Un clic ouvre le dossier
  professionnel complet. La file des documents isolés reste accessible
  (/admin/verifications) pour traiter un document sans ouvrir le dossier.
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, FileWarning, Search, ShieldCheck } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import {
  LIBELLES_STATUT_PRESTATAIRE,
  TONS_DOSSIER,
  TONS_STATUT_PRESTATAIRE,
  dateCourte,
  initiales,
} from '@/components/admin/verification/libelles'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { MBadge, MButton, MEmptyState, MErrorState, MPageHeader, MPagination, MTabs } from '@/components/ui'
import * as adminService from '@/services/adminService'

const route = useRoute()
const router = useRouter()

const EN_COURS = ['PROFIL_A_COMPLETER', 'DOCUMENTS_A_FOURNIR', 'DOCUMENTS_EN_ANALYSE', 'COHERENCE_A_VERIFIER', 'ENTRETIEN_A_FAIRE', 'ENTRETIEN_TERMINE']
const FILTRES = {
  a_decider: { label: 'À décider', statuts: ['DOSSIER_EN_REVUE'] },
  en_cours: { label: 'Parcours en cours', statuts: EN_COURS },
  renvoyes: { label: 'Renvoyés', statuts: ['A_VERIFIER'] },
  valides: { label: 'Validés', statuts: ['VALIDE'] },
  rejetes: { label: 'Rejetés', statuts: ['REJETE'] },
  tous: { label: 'Tous', statuts: [] },
}

// Lien direct depuis le tableau de bord : ?statut=VALIDE → onglet « Validés ».
function filtreDepuisRoute() {
  if (FILTRES[route.query.filtre]) return route.query.filtre
  const statut = route.query.statut
  const trouve = Object.entries(FILTRES).find(([, f]) => f.statuts.length === 1 && f.statuts[0] === statut)
  return trouve ? trouve[0] : 'a_decider'
}

const filtre = ref(filtreDepuisRoute())
const recherche = ref('')
const dossiers = ref([])
const compteurs = ref(null)
const chargement = ref(true)
const erreur = ref('')
let minuteurRecherche = null
let requete = 0

const somme = (statuts) => statuts.reduce((total, s) => total + (compteurs.value?.par_statut?.[s] ?? 0), 0)
const onglets = computed(() =>
  Object.entries(FILTRES).map(([value, f]) => ({
    value,
    label: f.label,
    count: compteurs.value ? (f.statuts.length ? somme(f.statuts) : compteurs.value.total) : undefined,
  })),
)

const indicateurs = computed(() => [
  { label: 'À décider', value: somme(['DOSSIER_EN_REVUE']), hint: 'Dossiers complets en attente de décision', icon: ShieldCheck },
  { label: 'Parcours en cours', value: somme(EN_COURS), hint: 'Prestataires qui complètent leur dossier' },
  { label: 'Validés', value: somme(['VALIDE']), hint: `${somme(['A_VERIFIER'])} renvoyés · ${somme(['REJETE'])} rejetés` },
  {
    label: 'Documents à vérifier',
    value: compteurs.value?.documents_a_verifier ?? 0,
    hint: 'Ouvrir la file des documents',
    icon: FileWarning,
    to: '/admin/verifications',
  },
])

async function chargerListe() {
  const numero = ++requete
  chargement.value = true
  erreur.value = ''
  try {
    const data = await adminService.listDossiersVerification(FILTRES[filtre.value].statuts.join(','), recherche.value.trim())
    // Une réponse plus ancienne (frappe rapide) ne doit pas écraser la dernière.
    if (numero === requete) {
      dossiers.value = Array.isArray(data) ? data : data?.results || []
      page.value = 1
    }
  } catch (e) {
    if (numero === requete) erreur.value = e.message
  } finally {
    if (numero === requete) chargement.value = false
  }
}

async function chargerCompteurs() {
  try {
    compteurs.value = await adminService.getCompteursDossiers()
  } catch {
    // Les onglets restent utilisables sans compteurs.
  }
}

/* ---------------------------------------------------------- tri et pagination */
const TAILLE_PAGE = 10
const page = ref(1)
const tri = ref({ cle: 'soumis_le', sens: 'desc' })
const COLONNES_TRIABLES = {
  nom_complet: (d) => (d.nom_complet || '').toLocaleLowerCase('fr'),
  statut: (d) => d.statut_libelle || '',
  date_inscription: (d) => d.date_inscription || '',
  soumis_le: (d) => d.soumis_le || '',
}

function trier(cle) {
  tri.value = tri.value.cle === cle ? { cle, sens: tri.value.sens === 'asc' ? 'desc' : 'asc' } : { cle, sens: cle === 'nom_complet' ? 'asc' : 'desc' }
  page.value = 1
}

const dossiersTries = computed(() => {
  const valeur = COLONNES_TRIABLES[tri.value.cle]
  const facteur = tri.value.sens === 'asc' ? 1 : -1
  // Les dossiers sans valeur (ex. jamais transmis) restent en fin de liste.
  return [...dossiers.value].sort((a, b) => {
    const va = valeur(a)
    const vb = valeur(b)
    if (!va && vb) return 1
    if (va && !vb) return -1
    return va < vb ? -facteur : va > vb ? facteur : 0
  })
})
const dossiersPage = computed(() => dossiersTries.value.slice((page.value - 1) * TAILLE_PAGE, page.value * TAILLE_PAGE))

function iconeTri(cle) {
  if (tri.value.cle !== cle) return ArrowUpDown
  return tri.value.sens === 'asc' ? ArrowUp : ArrowDown
}

function ariaTri(cle) {
  if (tri.value.cle !== cle) return 'none'
  return tri.value.sens === 'asc' ? 'ascending' : 'descending'
}

function ouvrir(dossier) {
  router.push({ name: 'admin-dossier', params: { id: dossier.id } })
}

watch(filtre, (valeur) => {
  const statuts = FILTRES[valeur].statuts
  router.replace({ query: statuts.length === 1 ? { statut: statuts[0] } : valeur === 'a_decider' ? {} : { filtre: valeur } })
  chargerListe()
})
watch(recherche, () => {
  clearTimeout(minuteurRecherche)
  minuteurRecherche = setTimeout(chargerListe, 300)
})

onMounted(() => {
  chargerListe()
  chargerCompteurs()
})
onBeforeUnmount(() => clearTimeout(minuteurRecherche))
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="flex flex-col gap-6">
      <MPageHeader
        title="Vérifications"
        description="Dossiers professionnels des prestataires : documents, analyses IA, entretien et historique. L'IA assiste, l'administrateur décide."
      >
        <template #actions>
          <MButton variant="outline" size="sm" :icon="FileWarning" to="/admin/verifications">File des documents</MButton>
        </template>
      </MPageHeader>

      <section class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Indicateurs de vérification">
        <KpiCard
          v-for="(item, index) in indicateurs"
          :key="item.label"
          v-bind="item"
          :loading="!compteurs"
          class="animate-rise"
          :style="{ '--reveal-delay': `${index * 50}ms` }"
        />
      </section>

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <MTabs v-model="filtre" :tabs="onglets" label="Filtrer les dossiers" variant="pill" />
        <label class="relative block lg:w-80">
          <span class="sr-only">Rechercher un prestataire</span>
          <Search :size="16" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            v-model="recherche"
            type="search"
            placeholder="Nom, e-mail ou métier…"
            class="h-10 w-full rounded-xl border border-line-strong bg-raised pr-3 pl-9 text-sm focus:border-brand focus:outline-none"
            data-test="recherche"
          />
        </label>
      </div>

      <div v-if="chargement && !dossiers.length" class="flex flex-col gap-2" aria-busy="true">
        <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-xl bg-sunken motion-reduce:animate-none" />
      </div>
      <MErrorState v-else-if="erreur" :message="erreur" @retry="chargerListe" />
      <MEmptyState
        v-else-if="!dossiers.length"
        :icon="ShieldCheck"
        :title="recherche ? 'Aucun résultat' : 'Aucun dossier'"
        :description="recherche ? 'Aucun prestataire ne correspond à cette recherche.' : filtre === 'a_decider' ? 'Aucun dossier complet n’attend votre décision. Tout est à jour.' : 'Aucun dossier ne correspond à ce filtre.'"
      />

      <template v-else>
        <!-- Grand écran : tableau -->
        <div class="hidden overflow-hidden rounded-card border border-line bg-surface md:block" :class="{ 'opacity-60': chargement }">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-line bg-sunken text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th class="px-4 py-3" scope="col" :aria-sort="ariaTri('nom_complet')">
                  <button type="button" class="tri" @click="trier('nom_complet')">
                    Prestataire <component :is="iconeTri('nom_complet')" :size="12" aria-hidden="true" />
                  </button>
                </th>
                <th class="px-4 py-3" scope="col">Métier</th>
                <th class="px-4 py-3" scope="col" :aria-sort="ariaTri('statut')">
                  <button type="button" class="tri" @click="trier('statut')">
                    Étape du dossier <component :is="iconeTri('statut')" :size="12" aria-hidden="true" />
                  </button>
                </th>
                <th class="hidden px-4 py-3 lg:table-cell" scope="col">Vérification</th>
                <th class="hidden px-4 py-3 xl:table-cell" scope="col" :aria-sort="ariaTri('date_inscription')">
                  <button type="button" class="tri" @click="trier('date_inscription')">
                    Inscrit le <component :is="iconeTri('date_inscription')" :size="12" aria-hidden="true" />
                  </button>
                </th>
                <th class="px-4 py-3" scope="col" :aria-sort="ariaTri('soumis_le')">
                  <button type="button" class="tri" @click="trier('soumis_le')">
                    Transmis le <component :is="iconeTri('soumis_le')" :size="12" aria-hidden="true" />
                  </button>
                </th>
                <th class="w-10 px-2 py-3"><span class="sr-only">Ouvrir</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="dossier in dossiersPage"
                :key="dossier.id"
                class="cursor-pointer transition-colors hover:bg-brand-mist focus-visible:bg-brand-mist focus-visible:outline-none"
                tabindex="0"
                data-test="ligne-dossier"
                @click="ouvrir(dossier)"
                @keydown.enter="ouvrir(dossier)"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img v-if="dossier.photo_url" :src="dossier.photo_url" alt="" class="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
                    <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden="true">{{ initiales(dossier.nom_complet) }}</span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-ink">{{ dossier.nom_complet || '—' }}</p>
                      <p class="truncate text-xs text-muted">{{ dossier.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p class="text-ink">{{ dossier.metier || '—' }}</p>
                  <p v-if="dossier.domaine" class="text-xs text-muted">{{ dossier.domaine }}</p>
                </td>
                <td class="px-4 py-3"><MBadge :variant="TONS_DOSSIER[dossier.statut] || 'neutral'" size="sm" dot>{{ dossier.statut_libelle }}</MBadge></td>
                <td class="hidden px-4 py-3 lg:table-cell">
                  <MBadge v-if="dossier.statut_verification" :variant="TONS_STATUT_PRESTATAIRE[dossier.statut_verification] || 'neutral'" size="sm">
                    {{ LIBELLES_STATUT_PRESTATAIRE[dossier.statut_verification] || dossier.statut_verification }}
                  </MBadge>
                </td>
                <td class="hidden px-4 py-3 text-ink-soft xl:table-cell">{{ dateCourte(dossier.date_inscription) }}</td>
                <td class="px-4 py-3 text-ink-soft">{{ dateCourte(dossier.soumis_le) }}</td>
                <td class="px-2 py-3 text-muted"><ChevronRight :size="16" aria-hidden="true" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Petit écran : cartes -->
        <ul class="flex flex-col gap-3 md:hidden">
          <li v-for="dossier in dossiersPage" :key="dossier.id">
            <button type="button" class="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 text-left" @click="ouvrir(dossier)">
              <span class="flex items-center gap-3">
                <img v-if="dossier.photo_url" :src="dossier.photo_url" alt="" class="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
                    <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden="true">{{ initiales(dossier.nom_complet) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold text-ink">{{ dossier.nom_complet || '—' }}</span>
                  <span class="block truncate text-xs text-muted">{{ dossier.metier || 'Métier non renseigné' }} · {{ dossier.email }}</span>
                </span>
                <ChevronRight :size="16" class="text-muted" aria-hidden="true" />
              </span>
              <span class="flex flex-wrap items-center gap-2">
                <MBadge :variant="TONS_DOSSIER[dossier.statut] || 'neutral'" size="sm" dot>{{ dossier.statut_libelle }}</MBadge>
                <span v-if="dossier.soumis_le" class="text-xs text-muted">Transmis le {{ dateCourte(dossier.soumis_le) }}</span>
              </span>
            </button>
          </li>
        </ul>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-muted">
            {{ dossiers.length }} dossier{{ dossiers.length > 1 ? 's' : '' }}<template v-if="dossiers.length > TAILLE_PAGE"> · page {{ page }} sur {{ Math.ceil(dossiers.length / TAILLE_PAGE) }}</template>
          </p>
          <MPagination v-if="dossiers.length > TAILLE_PAGE" :page="page" :count="dossiers.length" :page-size="TAILLE_PAGE" @update:page="page = $event" />
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.tri {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: pointer;
}

.tri:hover {
  color: var(--mimosy-text);
}
</style>
