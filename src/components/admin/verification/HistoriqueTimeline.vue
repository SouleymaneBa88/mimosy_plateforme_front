<!--
  Historique chronologique du dossier (EvenementDossier) : soumissions du
  prestataire, analyses automatiques, décisions des administrateurs.
  Chaque événement montre sa date et son heure, le document concerné,
  le statut, la décision, le motif, l'acteur et, pour une analyse, son
  résumé figé au moment où elle a été produite.
-->
<script setup>
import { computed, ref } from 'vue'
import { History } from 'lucide-vue-next'

import { MBadge, MTabs } from '@/components/ui'
import { CATEGORIES_EVENEMENT, LIBELLES_DECISION, TONS_DOCUMENT, correspondance, evenement } from './libelles'

const props = defineProps({ historique: { type: Array, default: () => [] } })

const filtre = ref('tous')
const ordre = ref('recent')

const evenements = computed(() =>
  props.historique.map((ev, index) => {
    const meta = evenement(ev.type)
    return { ...ev, cle: ev.id ?? index, meta, categorie: CATEGORIES_EVENEMENT[meta.categorie], details: ev.details || {} }
  }),
)

const compte = (categorie) => evenements.value.filter((ev) => ev.meta.categorie === categorie).length
const onglets = computed(() => [
  { value: 'tous', label: 'Tout', count: evenements.value.length },
  { value: 'soumission', label: 'Prestataire', count: compte('soumission') },
  { value: 'analyse', label: 'Analyses IA', count: compte('analyse') },
  { value: 'decision', label: 'Décisions', count: compte('decision') },
])

const affiches = computed(() => {
  const liste = filtre.value === 'tous' ? evenements.value : evenements.value.filter((ev) => ev.meta.categorie === filtre.value)
  return ordre.value === 'recent' ? [...liste].reverse() : liste
})

const LIBELLES_STATUT = { EN_ANALYSE: 'En analyse', A_VERIFIER: 'À vérifier', VALIDE: 'Validé', REJETE: 'Rejeté' }
const LIBELLES_ETAPE = { profil: 'Profil', identite: "Pièce d'identité", competences: 'Justificatif professionnel', entretien: 'Entretien' }
const LIBELLES_CHAMP = { nom: 'Nom', prenom: 'Prénom', date_naissance: 'Date de naissance' }

function jour(valeur) {
  return new Date(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function heure(valeur) {
  return new Date(valeur).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function acteur(ev) {
  if (!ev.acteur) return ev.meta.categorie === 'analyse' ? 'Système MIMOSY' : null
  const role = ev.acteur_role === 'ADMIN' ? 'Administrateur' : ev.acteur_role === 'PRESTATAIRE' ? 'Prestataire' : ''
  return [ev.acteur_nom || ev.acteur, role && `(${role})`].filter(Boolean).join(' ')
}
function aUnResume(details) {
  return Boolean(
    details.resume || Object.keys(details.correspondances || {}).length || details.alertes?.length || details.points_a_verifier?.length,
  )
}
const TONS_PASTILLE = {
  neutral: 'bg-sunken text-ink-soft',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand text-white',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <MTabs v-model="filtre" :tabs="onglets" label="Filtrer l'historique" variant="pill" />
      <label class="flex items-center gap-2 text-xs text-ink-soft">
        Ordre
        <select v-model="ordre" class="h-8 rounded-lg border border-line-strong bg-raised px-2 text-xs">
          <option value="recent">Plus récent d'abord</option>
          <option value="ancien">Chronologique</option>
        </select>
      </label>
    </div>

    <div v-if="!affiches.length" class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-soft">
      <History :size="20" class="text-muted" aria-hidden="true" />
      {{ evenements.length ? 'Aucun événement dans cette catégorie.' : 'Aucun événement enregistré pour ce dossier.' }}
    </div>

    <ol v-else class="relative flex flex-col" data-test="historique">
      <li v-for="(ev, index) in affiches" :key="ev.cle" class="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0 sm:grid-cols-[6.5rem_2rem_minmax(0,1fr)]">
        <!-- Date (colonne gauche sur grand écran) -->
        <div class="hidden pt-1 text-right sm:block">
          <p class="text-xs font-semibold text-ink">{{ jour(ev.date) }}</p>
          <p class="tabular text-xs text-muted">{{ heure(ev.date) }}</p>
        </div>

        <!-- Rail -->
        <div class="relative flex justify-center">
          <span v-if="index < affiches.length - 1" class="absolute top-8 bottom-[-4px] w-px bg-line-strong" aria-hidden="true" />
          <span class="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-surface" :class="TONS_PASTILLE[ev.categorie.ton]" aria-hidden="true">
            <component :is="ev.meta.icone" :size="15" :stroke-width="1.8" />
          </span>
        </div>

        <!-- Contenu -->
        <div class="min-w-0 rounded-xl border border-line bg-raised px-4 py-3" :class="{ 'border-l-[3px] border-l-brand': ev.meta.categorie === 'decision' }">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p class="text-sm font-bold text-ink">{{ ev.meta.titre }}</p>
            <span class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ ev.categorie.libelle }}</span>
          </div>
          <p class="mt-0.5 text-xs text-muted sm:hidden">{{ jour(ev.date) }} · {{ heure(ev.date) }}</p>
          <p class="mt-1 text-sm text-ink-soft">{{ ev.message }}</p>

          <div class="mt-2 flex flex-wrap gap-1.5">
            <MBadge v-if="ev.details.type_libelle" variant="neutral" size="sm">{{ ev.details.type_libelle }}</MBadge>
            <MBadge v-if="ev.details.statut && ev.meta.categorie !== 'decision'" :variant="TONS_DOCUMENT[ev.details.statut] || 'neutral'" size="sm">
              {{ LIBELLES_STATUT[ev.details.statut] || ev.details.statut }}
            </MBadge>
            <MBadge v-if="ev.details.decision" :variant="ev.details.decision === 'VALIDE' ? 'success' : ev.details.decision === 'REJETE' ? 'danger' : 'info'" size="sm">
              {{ LIBELLES_DECISION[ev.details.decision] || ev.details.decision }}
            </MBadge>
            <MBadge v-if="ev.details.remplacement" variant="info" size="sm">Nouvelle soumission</MBadge>
            <MBadge v-if="typeof ev.details.score === 'number'" variant="neutral" size="sm">Correspondance {{ Math.round(ev.details.score * 100) }} %</MBadge>
            <MBadge v-if="ev.details.etape_a_reprendre" variant="neutral" size="sm">Étape à reprendre : {{ LIBELLES_ETAPE[ev.details.etape_a_reprendre] || ev.details.etape_a_reprendre }}</MBadge>
          </div>

          <p v-if="ev.details.motif" class="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm text-ink">
            <span class="font-semibold">Motif :</span> {{ ev.details.motif }}
          </p>

          <!-- Résumé de l'analyse, figé au moment de l'événement -->
          <div v-if="ev.meta.categorie === 'analyse' && aUnResume(ev.details)" class="mt-2 rounded-lg border-l-[3px] border-l-info bg-info-soft px-3 py-2 text-sm">
            <p class="text-[11px] font-bold uppercase tracking-wide text-info">Résumé de l'analyse {{ ev.details.mode && ev.details.mode !== 'regles' ? 'IA' : 'automatique' }}</p>
            <p v-if="ev.details.resume" class="mt-1 text-ink">{{ ev.details.resume }}</p>
            <ul v-if="ev.details.correspondances && Object.keys(ev.details.correspondances).length" class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
              <li v-for="(valeur, champ) in ev.details.correspondances" :key="champ">
                {{ LIBELLES_CHAMP[champ] || champ }} : <strong>{{ correspondance(valeur).texte.toLowerCase() }}</strong>
              </li>
            </ul>
            <ul v-if="ev.details.alertes?.length" class="mt-1 list-disc pl-5 text-xs text-warning">
              <li v-for="alerte in ev.details.alertes" :key="alerte">{{ alerte }}</li>
            </ul>
            <ul v-if="ev.details.points_a_verifier?.length" class="mt-1 list-disc pl-5 text-xs text-ink-soft">
              <li v-for="point in ev.details.points_a_verifier" :key="point">{{ point }}</li>
            </ul>
          </div>

          <p v-if="acteur(ev)" class="mt-2 text-xs text-muted">{{ acteur(ev) }}<template v-if="ev.acteur && ev.acteur_nom"> · {{ ev.acteur }}</template></p>
        </div>
      </li>
    </ol>
  </div>
</template>
