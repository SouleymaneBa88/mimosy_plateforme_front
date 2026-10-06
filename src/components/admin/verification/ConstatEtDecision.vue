<!--
  Bande de synthèse en haut du dossier : à gauche ce que relèvent les
  analyses automatiques (une aide), à droite la décision humaine. Les deux
  blocs ont des styles volontairement différents pour qu'on ne puisse pas
  confondre un constat de l'IA avec une décision de l'administrateur.
-->
<script setup>
import { computed } from 'vue'
import { ArrowDown, Bot, CircleCheck, CircleX, Clock3, Gavel, RotateCcw, TriangleAlert } from 'lucide-vue-next'

import { LIBELLES_DECISION, dateHeure } from './libelles'

const props = defineProps({ dossier: { type: Object, required: true } })
const emit = defineEmits(['aller'])

const constats = computed(() => {
  const d = props.dossier
  const coherence = d.analyse_coherence || {}
  const synthese = d.synthese || {}
  const incoherences = new Set([...(coherence.incoherences || []), ...(synthese.incoherences || [])]).size
  const points = new Set([...(coherence.points_a_verifier || []), ...(synthese.points_a_verifier || [])]).size
  const cni = (d.documents || []).find((doc) => doc.type_document === 'PIECE_IDENTITE')
  const score = typeof cni?.score_correspondance === 'number' ? Math.round(cni.score_correspondance * 100) : null
  const entretien = (d.entretiens || []).find((e) => e.statut === 'TERMINE')
  return [
    {
      cle: 'identite',
      libelle: "Pièce d'identité",
      valeur: !cni ? 'Non fournie' : score !== null ? `${score} % de correspondance` : 'Lecture non disponible',
      ton: !cni ? 'neutre' : score === null ? 'neutre' : score >= 80 ? 'ok' : 'alerte',
    },
    {
      cle: 'incoherences',
      libelle: 'Incohérences relevées',
      valeur: d.analyse_coherence ? String(incoherences) : 'Non calculé',
      ton: !d.analyse_coherence ? 'neutre' : incoherences ? 'alerte' : 'ok',
    },
    {
      cle: 'points',
      libelle: 'Points à vérifier',
      valeur: d.analyse_coherence || d.synthese ? String(points) : 'Non calculé',
      ton: !(d.analyse_coherence || d.synthese) ? 'neutre' : points ? 'attention' : 'ok',
    },
    {
      cle: 'entretien',
      libelle: 'Entretien avec Fassa',
      valeur: entretien ? (entretien.rapport ? 'Rapport disponible' : 'Terminé') : 'Pas encore passé',
      ton: entretien ? 'ok' : 'neutre',
    },
  ]
})

const ICONES_TON = { ok: CircleCheck, alerte: CircleX, attention: TriangleAlert, neutre: Clock3 }
const COULEURS_TON = { ok: 'text-success', alerte: 'text-danger', attention: 'text-warning', neutre: 'text-muted' }

const decision = computed(() => {
  const d = props.dossier
  if (d.decision === 'VALIDE') return { icone: CircleCheck, classe: 'bg-success-soft text-success', titre: LIBELLES_DECISION.VALIDE }
  if (d.decision === 'REJETE') return { icone: CircleX, classe: 'bg-danger-soft text-danger', titre: LIBELLES_DECISION.REJETE }
  if (d.decision === 'A_VERIFIER') return { icone: RotateCcw, classe: 'bg-info-soft text-info', titre: LIBELLES_DECISION.A_VERIFIER }
  return {
    icone: Clock3,
    classe: 'bg-warning-soft text-warning',
    titre: d.statut === 'DOSSIER_EN_REVUE' ? 'En attente de votre décision' : 'Pas encore de décision',
  }
})
</script>

<template>
  <section class="grid overflow-hidden rounded-card border border-line md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" aria-label="Constat de l'IA et décision de l'administrateur">
    <!-- Constat de l'IA : aide -->
    <div class="flex flex-col gap-3 border-b border-line bg-info-soft/60 p-4 md:border-r md:border-b-0 sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-info">
          <Bot :size="15" aria-hidden="true" /> Constat des analyses IA
        </p>
        <button type="button" class="flex cursor-pointer items-center gap-1 text-xs font-semibold text-info hover:underline" @click="emit('aller', 'analyse-ia')">
          Détail <ArrowDown :size="12" aria-hidden="true" />
        </button>
      </div>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div v-for="item in constats" :key="item.cle" class="min-w-0">
          <dt class="text-xs text-ink-soft">{{ item.libelle }}</dt>
          <dd class="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <component :is="ICONES_TON[item.ton]" :size="14" :class="COULEURS_TON[item.ton]" aria-hidden="true" />
            <span class="truncate">{{ item.valeur }}</span>
          </dd>
        </div>
      </dl>
      <p class="text-[11px] text-info">L'IA relève des éléments ; elle ne valide ni ne rejette.</p>
    </div>

    <!-- Décision humaine -->
    <div class="flex flex-col gap-3 bg-raised p-4 sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
          <Gavel :size="15" aria-hidden="true" /> Décision administrateur
        </p>
        <button type="button" class="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline" @click="emit('aller', 'decision')">
          {{ dossier.decision ? 'Voir' : 'Décider' }} <ArrowDown :size="12" aria-hidden="true" />
        </button>
      </div>
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="decision.classe" aria-hidden="true">
          <component :is="decision.icone" :size="19" />
        </span>
        <div class="min-w-0">
          <p class="text-[15px] font-bold text-ink">{{ decision.titre }}</p>
          <p v-if="dossier.decision" class="text-xs text-muted">par {{ dossier.decide_par || '—' }} · {{ dateHeure(dossier.date_decision) }}</p>
          <p v-if="dossier.motif_decision" class="mt-1 line-clamp-2 text-sm text-ink-soft"><span class="font-semibold">Motif :</span> {{ dossier.motif_decision }}</p>
        </div>
      </div>
      <p class="mt-auto text-[11px] text-muted">Seule cette décision humaine change le statut du prestataire.</p>
    </div>
  </section>
</template>
