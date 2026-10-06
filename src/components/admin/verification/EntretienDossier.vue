<!--
  Entretien professionnel mené par Fassa (IA) : vidéo, résumé structuré
  du rapport, questions/réponses et transcription complète. Le rapport est
  informationnel : ni note, ni recommandation. La décision reste humaine.
-->
<script setup>
import { computed } from 'vue'
import { Clock, Mic, UserCheck } from 'lucide-vue-next'

import BlocAnalyseIA from './BlocAnalyseIA.vue'
import ListePoints from './ListePoints.vue'
import { dateHeure } from './libelles'

const props = defineProps({
  entretien: { type: Object, default: null },
  profil: { type: Object, default: () => ({}) },
  video: { type: Object, default: null },
  nombreEntretiens: { type: Number, default: 0 },
})

const rapport = computed(() => props.entretien?.rapport || null)

function duree(secondes) {
  if (secondes === null || secondes === undefined) return '—'
  return `${Math.floor(secondes / 60)} min ${String(secondes % 60).padStart(2, '0')} s`
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="entretien">
    <p v-if="!entretien" class="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-soft">
      Le prestataire n'a pas encore passé l'entretien professionnel.
    </p>

    <template v-else>
      <ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        <li class="flex items-center gap-1.5"><Mic :size="13" aria-hidden="true" /> {{ dateHeure(entretien.debut) }}</li>
        <li class="flex items-center gap-1.5"><Clock :size="13" aria-hidden="true" /> {{ duree(entretien.duree_secondes) }}</li>
        <li>Consentement à l'enregistrement : {{ dateHeure(entretien.consentement_le) }}</li>
        <li>Questions {{ entretien.mode !== 'regles' ? 'générées par IA' : 'issues du modèle standard' }}</li>
        <li v-if="nombreEntretiens > 1">{{ nombreEntretiens }} entretiens au total (le plus récent terminé est affiché)</li>
      </ul>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div class="flex flex-col gap-2">
          <video v-if="video?.url" :src="video.url" controls class="w-full rounded-xl border border-line bg-black" data-test="video" />
          <p v-else-if="video?.erreur" class="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{{ video.erreur }}</p>
          <p v-else-if="!entretien.enregistrement_url" class="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-ink-soft">Aucun enregistrement vidéo.</p>
          <p v-else class="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-ink-soft">Chargement de la vidéo…</p>
          <p class="text-xs text-muted">La vidéo contient la voix du prestataire ; les questions de Fassa figurent dans la transcription.</p>
        </div>

        <BlocAnalyseIA
          v-if="rapport"
          titre="Résumé de l'entretien"
          agent="Fassa"
          :mode="rapport.mode || entretien.mode"
          data-test="rapport"
        >
          <dl class="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5">
            <dt class="text-ink-soft">Métier déclaré</dt><dd class="font-semibold">{{ profil.metier || '—' }}</dd>
            <dt class="text-ink-soft">Expérience évoquée</dt><dd>{{ rapport.experience_declaree || '—' }}</dd>
            <template v-if="rapport.services_mentionnes?.length">
              <dt class="text-ink-soft">Services évoqués</dt><dd>{{ rapport.services_mentionnes.join(', ') }}</dd>
            </template>
          </dl>

          <div v-if="rapport.elements_importants?.length" class="mt-3" data-test="elements-importants">
            <p class="mb-1 text-xs font-bold uppercase tracking-wide text-info">Compétences et éléments mentionnés</p>
            <ul class="list-disc pl-5"><li v-for="point in rapport.elements_importants" :key="point">{{ point }}</li></ul>
          </div>

          <div v-if="rapport.resume" class="mt-3">
            <p class="mb-1 text-xs font-bold uppercase tracking-wide text-info">Observations</p>
            <p>{{ rapport.resume }}</p>
          </div>

          <div class="mt-3 flex flex-col gap-3">
            <ListePoints titre="Points cohérents" :points="rapport.points_coherents" ton="success" />
            <ListePoints titre="Points à vérifier" :points="rapport.points_a_verifier" ton="warning" />
            <ListePoints titre="Incohérences détectées" :points="rapport.incoherences_detectees" ton="danger" />
          </div>

          <p class="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm">
            <UserCheck :size="15" class="text-brand" aria-hidden="true" />
            <span><span class="text-ink-soft">Décision finale :</span> <strong>à prendre par l'administrateur.</strong></span>
          </p>
        </BlocAnalyseIA>
        <p v-else class="rounded-xl bg-sunken px-4 py-6 text-center text-sm text-ink-soft">Le rapport de l'entretien n'est pas encore disponible.</p>
      </div>

      <details v-if="rapport?.questions_reponses?.length" class="group rounded-xl border border-line" data-test="questions-reponses">
        <summary class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand marker:hidden">
          Questions posées et réponses ({{ rapport.questions_reponses.length }})
        </summary>
        <ol class="flex flex-col gap-4 border-t border-line px-4 py-4 text-sm">
          <li v-for="q in rapport.questions_reponses" :key="q.numero">
            <p class="font-semibold text-ink">{{ q.numero }}. {{ q.question }}</p>
            <p v-if="q.objectif" class="text-xs text-muted">Objectif : {{ q.objectif }}</p>
            <p v-for="(reponse, i) in q.reponses" :key="i" class="mt-1 text-ink">
              <span class="text-xs text-muted">{{ reponse.mode === 'VOIX' ? 'À la voix' : 'Par écrit' }}<template v-if="reponse.duree != null"> · {{ Math.round(reponse.duree) }} s</template> —</span>
              {{ reponse.texte || '(pas de réponse)' }}
            </p>
            <p v-for="(relance, i) in q.relances" :key="`r${i}`" class="mt-1 text-xs text-ink-soft">Relance de Fassa : {{ relance }}</p>
          </li>
        </ol>
      </details>

      <details class="rounded-xl border border-line">
        <summary class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand">Transcription complète</summary>
        <div class="border-t border-line px-4 py-3">
          <pre class="max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm text-ink" data-test="transcription">{{ entretien.transcription }}</pre>
          <p class="mt-2 text-xs text-muted">Réponses orales transcrites automatiquement : la transcription peut contenir des erreurs de mots.</p>
        </div>
      </details>
    </template>
  </div>
</template>
