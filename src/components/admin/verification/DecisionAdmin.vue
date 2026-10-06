<!--
  Décision de l'administrateur sur le dossier complet. C'est la SEULE
  action qui change le statut du prestataire (règles appliquées côté
  serveur : validation possible uniquement pour un dossier en revue, motif
  obligatoire pour un rejet ou une nouvelle vérification). Le motif est
  conservé dans l'historique et transmis au prestataire.
-->
<script setup>
import { computed, ref } from 'vue'
import { CircleCheck, CircleX, Gavel, RotateCcw, TriangleAlert } from 'lucide-vue-next'

import { MButton } from '@/components/ui'
import ListePoints from './ListePoints.vue'
import { ETAPES_A_REPRENDRE, LIBELLES_DECISION, dateHeure } from './libelles'

const props = defineProps({
  dossier: { type: Object, required: true },
  envoi: { type: Boolean, default: false },
  erreur: { type: String, default: '' },
})
const emit = defineEmits(['decider'])

const ACTIONS = {
  VALIDE: {
    titre: 'Valider le prestataire',
    texte: 'Le prestataire pourra publier ses services. Vérifiez les documents, la vidéo et les points d’attention avant de confirmer.',
    bouton: 'Confirmer la validation',
    variante: 'primary',
  },
  A_VERIFIER: {
    titre: 'Demander une nouvelle vérification',
    texte: 'Le dossier est renvoyé au prestataire, qui devra refaire l’étape choisie.',
    bouton: 'Renvoyer au prestataire',
    variante: 'primary',
  },
  REJETE: {
    titre: 'Rejeter le dossier',
    texte: 'Le prestataire est informé du rejet et du motif.',
    bouton: 'Confirmer le rejet',
    variante: 'danger',
  },
}

const choix = ref('')
const motif = ref('')
const etape = ref('')

const peutValider = computed(() => props.dossier.statut === 'DOSSIER_EN_REVUE')
const action = computed(() => ACTIONS[choix.value])
const motifObligatoire = computed(() => choix.value === 'A_VERIFIER' || choix.value === 'REJETE')

// Points d'attention relevés par les analyses (synthèse + cohérence), sans doublon.
const pointsAttention = computed(() => {
  const synthese = props.dossier.synthese || {}
  const coherence = props.dossier.analyse_coherence || {}
  return {
    incoherences: [...new Set([...(coherence.incoherences || []), ...(synthese.incoherences || [])])],
    aVerifier: [...new Set([...(synthese.points_a_verifier || []), ...(coherence.points_a_verifier || [])])].slice(0, 6),
  }
})

function ouvrir(decision) {
  choix.value = decision
  motif.value = ''
  etape.value = ''
}

function confirmer() {
  emit('decider', { decision: choix.value, motif: motif.value, etape: etape.value })
}

defineExpose({ fermer: () => (choix.value = '') })
</script>

<template>
  <section class="flex flex-col gap-4 rounded-card border-2 border-brand/25 bg-raised p-5" aria-labelledby="titre-decision">
    <div class="flex items-center gap-2.5">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white" aria-hidden="true"><Gavel :size="16" /></span>
      <div>
        <h2 id="titre-decision" class="font-serif text-[22px] leading-7 text-ink">Décision administrateur</h2>
        <p class="text-xs text-ink-soft">Décision humaine · seule action qui change le statut du prestataire</p>
      </div>
    </div>

    <!-- Décision actuelle -->
    <div v-if="dossier.decision" class="rounded-xl bg-sunken px-3.5 py-3 text-sm">
      <p class="text-ink">
        <strong>{{ LIBELLES_DECISION[dossier.decision] || dossier.decision }}</strong>
        <span class="text-ink-soft"> par {{ dossier.decide_par || '—' }} · {{ dateHeure(dossier.date_decision) }}</span>
      </p>
      <p v-if="dossier.motif_decision" class="mt-1 text-ink"><span class="text-ink-soft">Motif :</span> {{ dossier.motif_decision }}</p>
    </div>

    <!-- Points d'attention issus des analyses -->
    <div v-if="pointsAttention.incoherences.length || pointsAttention.aVerifier.length" class="flex flex-col gap-3 rounded-xl border border-line px-3.5 py-3">
      <p class="text-xs text-muted">Relevés par les analyses automatiques — à contrôler avant de décider :</p>
      <ListePoints titre="Incohérences" :points="pointsAttention.incoherences" ton="danger" />
      <ListePoints titre="À vérifier" :points="pointsAttention.aVerifier" ton="warning" />
    </div>

    <!-- Choix de la décision -->
    <div v-if="!choix" class="flex flex-col gap-2">
      <MButton block :icon="CircleCheck" :disabled="!peutValider" data-test="valider" @click="ouvrir('VALIDE')">Valider</MButton>
      <MButton block variant="danger" :icon="CircleX" data-test="rejeter" @click="ouvrir('REJETE')">Rejeter</MButton>
      <MButton block variant="outline" :icon="RotateCcw" data-test="a-verifier" @click="ouvrir('A_VERIFIER')">Demander une nouvelle vérification</MButton>
      <p v-if="!peutValider && dossier.statut !== 'VALIDE'" class="flex items-start gap-1.5 text-xs text-muted">
        <TriangleAlert :size="13" class="mt-0.5 shrink-0" aria-hidden="true" />
        La validation n'est possible qu'une fois le dossier complet (entretien passé et dossier transmis).
      </p>
    </div>

    <form v-else class="flex flex-col gap-3" data-test="formulaire-decision" @submit.prevent="confirmer">
      <div>
        <p class="text-sm font-bold text-ink">{{ action.titre }}</p>
        <p class="text-xs text-ink-soft">{{ action.texte }}</p>
      </div>
      <label v-if="choix === 'A_VERIFIER'" class="flex flex-col gap-1 text-sm font-semibold text-ink">
        Étape à reprendre
        <select v-model="etape" required class="h-11 rounded-xl border border-line-strong bg-raised px-3 font-normal focus:border-brand focus:outline-none" data-test="etape-a-reprendre">
          <option value="" disabled>Choisissez…</option>
          <option v-for="e in ETAPES_A_REPRENDRE" :key="e.valeur" :value="e.valeur">{{ e.libelle }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-semibold text-ink">
        {{ choix === 'REJETE' ? 'Motif du rejet' : 'Motif' }}
        <span class="text-xs font-normal text-muted">{{ motifObligatoire ? 'Obligatoire · visible par le prestataire et conservé dans l’historique' : 'Facultatif' }}</span>
        <textarea
          v-model="motif"
          rows="4"
          maxlength="2000"
          :required="motifObligatoire"
          class="rounded-xl border border-line-strong bg-raised px-3 py-2 font-normal focus:border-brand focus:outline-none"
          data-test="motif"
        />
      </label>
      <p v-if="erreur" class="text-sm text-danger" role="alert">{{ erreur }}</p>
      <div class="flex flex-wrap justify-end gap-2">
        <MButton variant="ghost" :disabled="envoi" @click="choix = ''">Annuler</MButton>
        <MButton type="submit" :variant="action.variante" :loading="envoi" data-test="confirmer-decision">{{ action.bouton }}</MButton>
      </div>
    </form>
  </section>
</template>
