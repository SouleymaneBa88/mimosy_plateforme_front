<!--
  En-tête du dossier : identité du prestataire, statut du dossier et statut
  de vérification, progression du parcours (étapes calculées par le
  serveur) et accès rapide aux sections de la fiche.
-->
<script setup>
import { computed, ref } from 'vue'
import { Briefcase, CalendarClock, Check, Mail, Phone, Send } from 'lucide-vue-next'

import { MBadge, MStatusBadge } from '@/components/ui'
import {
  LIBELLES_STATUT_PRESTATAIRE,
  TONS_DOSSIER,
  TONS_STATUT_PRESTATAIRE,
  dateCourte,
  dateHeure,
  initiales,
} from './libelles'

const props = defineProps({ dossier: { type: Object, required: true } })

const SECTIONS = [
  { id: 'documents', libelle: 'Documents' },
  { id: 'analyse-ia', libelle: 'Analyse IA' },
  { id: 'entretien', libelle: 'Entretien' },
  { id: 'decision', libelle: 'Décision' },
  { id: 'historique', libelle: 'Historique' },
]

const photoIndisponible = ref(false)
const profil = computed(() => props.dossier.profil || {})
const documents = computed(() => props.dossier.documents || [])
const etapes = computed(() => props.dossier.parcours?.etapes || [])
const statutPrestataire = computed(() => profil.value.statut_verification)

const coordonnees = computed(() => [
  { icone: Mail, texte: profil.value.email || props.dossier.email },
  { icone: Phone, texte: profil.value.telephone },
  { icone: Briefcase, texte: [profil.value.metier, profil.value.domaine].filter(Boolean).join(' · ') || 'Métier non renseigné' },
  { icone: CalendarClock, texte: profil.value.date_inscription ? `Inscrit le ${dateCourte(profil.value.date_inscription)}` : '' },
].filter((ligne) => ligne.texte))

function allerA(id) {
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <section class="overflow-hidden rounded-card border border-line bg-surface">
    <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex min-w-0 gap-4">
        <img
          v-if="dossier.photo_url && !photoIndisponible"
          :src="dossier.photo_url"
          :alt="`Photo de ${dossier.nom_complet}`"
          class="h-16 w-16 shrink-0 rounded-2xl border border-line object-cover"
          @error="photoIndisponible = true"
        />
        <span v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-serif text-2xl text-brand" :title="dossier.photo_url ? 'Photo indisponible' : 'Aucune photo de profil'" aria-hidden="true">
          {{ initiales(dossier.nom_complet) }}
        </span>
        <div class="min-w-0">
          <h1 class="font-serif text-[30px] leading-9 text-ink sm:text-[34px] sm:leading-10">{{ dossier.nom_complet || 'Prestataire' }}</h1>
          <ul class="mt-2 flex flex-wrap gap-x-5 gap-y-1.5" aria-label="Coordonnées">
            <li v-for="ligne in coordonnees" :key="ligne.texte" class="flex items-center gap-1.5 text-sm text-ink-soft">
              <component :is="ligne.icone" :size="14" :stroke-width="1.8" class="text-muted" aria-hidden="true" />
              <span class="break-all">{{ ligne.texte }}</span>
            </li>
          </ul>
          <ul v-if="documents.length" class="mt-3 flex flex-wrap gap-1.5" aria-label="Documents soumis">
            <li v-for="doc in documents" :key="doc.id">
              <MStatusBadge :status="doc.statut" :label="`${doc.type_libelle} · ${doc.statut_libelle}`" size="sm" />
            </li>
          </ul>
        </div>
      </div>

      <dl class="grid shrink-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:flex-col lg:items-end">
        <div class="flex flex-col gap-1 lg:items-end">
          <dt class="text-[11px] font-bold uppercase tracking-wider text-muted">Dossier</dt>
          <dd><MBadge :variant="TONS_DOSSIER[dossier.statut] || 'neutral'" dot data-test="statut">{{ dossier.statut_libelle }}</MBadge></dd>
        </div>
        <div v-if="statutPrestataire" class="flex flex-col gap-1 lg:items-end">
          <dt class="text-[11px] font-bold uppercase tracking-wider text-muted">Vérification</dt>
          <dd><MBadge :variant="TONS_STATUT_PRESTATAIRE[statutPrestataire] || 'neutral'">{{ LIBELLES_STATUT_PRESTATAIRE[statutPrestataire] || statutPrestataire }}</MBadge></dd>
        </div>
        <div v-if="dossier.soumis_le" class="col-span-2 flex items-center gap-1.5 text-xs text-muted lg:justify-end">
          <Send :size="12" aria-hidden="true" /> Transmis le {{ dateHeure(dossier.soumis_le) }}
        </div>
      </dl>
    </div>

    <!-- Progression du parcours -->
    <div v-if="etapes.length" class="border-t border-line bg-raised px-5 py-4 sm:px-6">
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-xs font-bold uppercase tracking-wider text-muted">Parcours de vérification</p>
        <p v-if="dossier.parcours?.pourcentage !== undefined" class="tabular text-xs font-semibold text-ink-soft">{{ dossier.parcours.pourcentage }} %</p>
      </div>
      <ol class="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Étapes du parcours">
        <li v-for="etape in etapes" :key="etape.cle" class="flex flex-col gap-1.5">
          <span
            class="h-1.5 rounded-full"
            :class="etape.etat === 'termine' ? 'bg-brand' : etape.etat === 'en_cours' ? 'bg-warning' : 'bg-sunken'"
            aria-hidden="true"
          />
          <span class="flex items-center gap-1 text-xs" :class="etape.etat === 'a_faire' ? 'text-muted' : 'font-semibold text-ink'">
            <Check v-if="etape.etat === 'termine'" :size="12" :stroke-width="2.5" class="text-brand" aria-hidden="true" />
            {{ etape.libelle }}
            <span class="sr-only">({{ etape.etat === 'termine' ? 'terminée' : etape.etat === 'en_cours' ? 'en cours' : 'à faire' }})</span>
          </span>
        </li>
      </ol>
    </div>

    <!-- Accès rapide aux sections -->
    <nav class="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 sm:px-4" aria-label="Sections du dossier">
      <button
        v-for="section in SECTIONS"
        :key="section.id"
        type="button"
        class="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-mist hover:text-brand"
        @click="allerA(section.id)"
      >
        {{ section.libelle }}
      </button>
    </nav>
  </section>
</template>
