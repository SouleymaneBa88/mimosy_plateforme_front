<!--
  Un document soumis par le prestataire, de haut en bas :
    1. le document lui-même (aperçu protégé, ouverture en grand) ;
    2. l'analyse automatique (lecture OCR, lecture IA) : une aide ;
    3. la décision de l'administrateur sur ce document, et ses actions.
  Valider ou rejeter un document ne change pas le statut du prestataire :
  seule la décision sur le dossier complet le fait (règle backend).
-->
<script setup>
import { computed, ref } from 'vue'
import { Award, ExternalLink, FileText, GraduationCap, IdCard, ShieldAlert, UserCheck } from 'lucide-vue-next'

import { MBadge, MButton } from '@/components/ui'
import BlocAnalyseIA from './BlocAnalyseIA.vue'
import ListePoints from './ListePoints.vue'
import { CHAMPS_IDENTITE, TONS_DOCUMENT, correspondance, dateHeure } from './libelles'

const props = defineProps({
  document: { type: Object, required: true },
  fichier: { type: Object, default: null },
  // Lecture IA de la pièce d'identité (dossier.analyse_identite), si ce document est la CNI.
  analyseIdentite: { type: Object, default: null },
  // Analyse IA du justificatif (dossier.analyse_competence), si elle porte sur ce document.
  analyseCompetence: { type: Object, default: null },
  enCours: { type: Boolean, default: false },
  erreur: { type: String, default: '' },
})
const emit = defineEmits(['valider', 'rejeter'])

const ICONES = { PIECE_IDENTITE: IdCard, DIPLOME: GraduationCap, CERTIFICATION: Award, DOCUMENT_PROFESSIONNEL: FileText }

const estIdentite = computed(() => props.document.type_document === 'PIECE_IDENTITE')
const apercuImpossible = ref(false)
const rejetOuvert = ref(false)
const motif = ref('')
const erreurMotif = ref('')

const champsCompares = computed(() => Object.entries(props.document.resultat_comparaison?.champs || {}))
const score = computed(() => {
  const valeur = props.document.score_correspondance
  return typeof valeur === 'number' ? Math.round(valeur * 100) : null
})
const erreurTechnique = computed(() => (props.document.motif_rejet_complet || '').startsWith('[ERREUR TECHNIQUE]'))
const peutValider = computed(() => ['A_VERIFIER', 'REJETE'].includes(props.document.statut))
const peutRejeter = computed(() => ['A_VERIFIER', 'VALIDE'].includes(props.document.statut))
const decide = computed(() => ['VALIDE', 'REJETE'].includes(props.document.statut))
const iaIdentite = computed(() => (props.analyseIdentite && props.analyseIdentite.mode !== 'regles' ? props.analyseIdentite : null))

function confirmerRejet() {
  const texte = motif.value.trim()
  if (texte.length < 5) {
    erreurMotif.value = 'Indiquez un motif (5 caractères minimum) : il sera transmis au prestataire.'
    return
  }
  erreurMotif.value = ''
  emit('rejeter', props.document, texte)
}

function ouvrirRejet() {
  rejetOuvert.value = true
  motif.value = ''
  erreurMotif.value = ''
}

defineExpose({ fermerRejet: () => (rejetOuvert.value = false) })
</script>

<template>
  <article class="flex flex-col overflow-hidden rounded-card border border-line bg-raised" data-test="document">
    <!-- En-tête -->
    <header class="flex items-start gap-3 border-b border-line px-4 py-3.5">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft" aria-hidden="true">
        <component :is="ICONES[document.type_document] || FileText" :size="17" :stroke-width="1.7" />
      </span>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-bold text-ink">{{ document.type_libelle }}</h3>
        <p class="text-xs text-muted">Soumis le {{ dateHeure(document.date_soumission) }}</p>
      </div>
      <MBadge :variant="TONS_DOCUMENT[document.statut] || 'neutral'" size="sm">{{ document.statut_libelle }}</MBadge>
    </header>

    <div class="flex flex-col gap-4 p-4">
      <!-- 1. Le document -->
      <div class="overflow-hidden rounded-xl border border-line bg-sunken">
        <a
          v-if="fichier?.url && !apercuImpossible"
          :href="fichier.url"
          target="_blank"
          rel="noopener"
          class="group relative block"
          title="Ouvrir le document en grand"
        >
          <img
            :src="fichier.url"
            :alt="document.type_libelle"
            class="mx-auto max-h-52 w-auto object-contain transition-opacity group-hover:opacity-90"
            @error="apercuImpossible = true"
          />
        </a>
        <div v-else class="flex min-h-24 flex-col items-center justify-center gap-2 p-4 text-center">
          <FileText :size="22" :stroke-width="1.5" class="text-muted" aria-hidden="true" />
          <p v-if="fichier?.erreur" class="text-xs text-danger">{{ fichier.erreur }}</p>
          <p v-else-if="!fichier?.url" class="text-xs text-muted">Chargement du document…</p>
          <p v-else class="text-xs text-ink-soft">Aperçu indisponible (PDF ou format non affichable).</p>
        </div>
        <a
          v-if="fichier?.url"
          :href="fichier.url"
          target="_blank"
          rel="noopener"
          class="flex items-center justify-center gap-1.5 border-t border-line bg-raised py-2 text-xs font-semibold text-brand hover:underline"
        >
          <ExternalLink :size="13" aria-hidden="true" /> Ouvrir le document
        </a>
      </div>

      <!-- 2. Analyse automatique -->
      <p v-if="erreurTechnique" class="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
        <ShieldAlert :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        La lecture automatique a échoué pour une raison technique : examinez directement le document.
      </p>

      <BlocAnalyseIA
        v-if="estIdentite && (champsCompares.length || iaIdentite)"
        titre="Analyse de la pièce d'identité"
        :mode="iaIdentite?.mode || 'regles'"
        data-test="analyse-identite"
      >
        <template v-if="score !== null" #badge>
          <span class="tabular shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-info" title="Moyenne des ressemblances sur les champs comparables (OCR)">
            Correspondance {{ score }} %
          </span>
        </template>

        <div v-if="champsCompares.length" class="overflow-x-auto">
          <table class="w-full min-w-[320px] text-left text-xs">
            <thead class="text-muted">
              <tr>
                <th class="py-1.5 pr-2 font-semibold" scope="col">Information</th>
                <th class="py-1.5 pr-2 font-semibold" scope="col">Profil</th>
                <th class="py-1.5 pr-2 font-semibold" scope="col">Lu sur le document</th>
                <th class="py-1.5 font-semibold" scope="col">Résultat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[cle, champ] in champsCompares" :key="cle" class="border-t border-[#d5e3e5]">
                <th class="py-1.5 pr-2 font-medium text-ink-soft" scope="row">{{ CHAMPS_IDENTITE[cle] || cle }}</th>
                <td class="py-1.5 pr-2">{{ champ.profil || '—' }}</td>
                <td class="py-1.5 pr-2" :class="{ 'font-semibold text-danger': champ.correspond === false }">{{ champ.document || 'illisible' }}</td>
                <td class="py-1.5">
                  <MBadge :variant="champ.verifiable === false ? 'neutral' : correspondance(champ.correspond).ton" size="sm">
                    {{ champ.verifiable === false ? 'Non vérifiable' : correspondance(champ.correspond).texte }}
                  </MBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="iaIdentite" class="mt-3 flex flex-col gap-2 border-t border-[#d5e3e5] pt-3">
          <p class="text-xs font-bold uppercase tracking-wide text-info">Lecture IA · {{ iaIdentite.lisible ? 'document lisible' : 'document peu lisible' }}</p>
          <dl class="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1 text-xs">
            <dt class="text-ink-soft">Type de pièce</dt><dd>{{ iaIdentite.type_piece || '—' }}</dd>
            <dt class="text-ink-soft">Nom lu</dt>
            <dd>{{ iaIdentite.nom || '—' }} <MBadge :variant="correspondance(iaIdentite.correspond_nom).ton" size="sm">{{ correspondance(iaIdentite.correspond_nom).texte }}</MBadge></dd>
            <dt class="text-ink-soft">Prénom lu</dt>
            <dd>{{ iaIdentite.prenom || '—' }} <MBadge :variant="correspondance(iaIdentite.correspond_prenom).ton" size="sm">{{ correspondance(iaIdentite.correspond_prenom).texte }}</MBadge></dd>
            <dt class="text-ink-soft">Date de naissance</dt><dd>{{ iaIdentite.date_naissance || '—' }}</dd>
            <dt class="text-ink-soft">Numéro</dt><dd>{{ iaIdentite.numero_document || '—' }}</dd>
            <dt class="text-ink-soft">Expiration</dt><dd>{{ iaIdentite.date_expiration || '—' }}</dd>
          </dl>
          <p v-if="iaIdentite.observations" class="text-sm">{{ iaIdentite.observations }}</p>
          <ListePoints titre="Alertes" :points="iaIdentite.anomalies_apparentes" ton="warning" />
        </div>
      </BlocAnalyseIA>

      <BlocAnalyseIA
        v-else-if="analyseCompetence"
        titre="Analyse du justificatif professionnel"
        :mode="analyseCompetence.mode"
        data-test="analyse-competence"
      >
        <template #badge>
          <MBadge :variant="analyseCompetence.conclusion?.etat === 'COHERENCE_APPARENTE' ? 'success' : 'warning'" size="sm">
            {{ analyseCompetence.conclusion?.etat === 'COHERENCE_APPARENTE' ? 'Cohérence apparente' : 'À vérifier' }}
          </MBadge>
        </template>
        <dl class="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1 text-xs">
          <dt class="text-ink-soft">Type détecté</dt><dd>{{ analyseCompetence.type_document_detecte || '—' }}</dd>
          <dt class="text-ink-soft">Domaine</dt><dd>{{ analyseCompetence.domaine_document || '—' }}</dd>
          <dt class="text-ink-soft">Titulaire</dt>
          <dd>{{ analyseCompetence.nom_titulaire || '—' }} <MBadge v-if="analyseCompetence.correspond_au_nom" :variant="correspondance(analyseCompetence.correspond_au_nom).ton" size="sm">{{ correspondance(analyseCompetence.correspond_au_nom).texte }}</MBadge></dd>
          <dt class="text-ink-soft">Organisme émetteur</dt><dd>{{ analyseCompetence.organisme_emetteur || '—' }}</dd>
          <dt class="text-ink-soft">Date du document</dt><dd>{{ analyseCompetence.date_document || '—' }}</dd>
          <dt class="text-ink-soft">Domaine déclaré</dt>
          <dd>{{ analyseCompetence.conclusion?.domaine || '—' }} <MBadge v-if="analyseCompetence.correspond_au_domaine" :variant="correspondance(analyseCompetence.correspond_au_domaine).ton" size="sm">{{ correspondance(analyseCompetence.correspond_au_domaine).texte }}</MBadge></dd>
        </dl>
        <p v-if="analyseCompetence.observations" class="mt-2 text-sm">{{ analyseCompetence.observations }}</p>
        <ListePoints class="mt-2" titre="Alertes" :points="analyseCompetence.anomalies_apparentes" ton="warning" />
      </BlocAnalyseIA>

      <p v-else-if="document.statut === 'EN_ANALYSE'" class="rounded-lg bg-info-soft px-3 py-2 text-xs text-info">Analyse automatique en cours…</p>
      <p v-else class="rounded-lg bg-sunken px-3 py-2 text-xs text-ink-soft">Aucune analyse automatique pour ce document : à examiner directement.</p>

      <!-- 3. Décision de l'administrateur -->
      <div class="rounded-xl border border-line-strong bg-surface p-3.5">
        <p class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
          <UserCheck :size="14" aria-hidden="true" /> Décision administrateur
        </p>
        <p v-if="decide" class="text-sm text-ink">
          <strong>{{ document.statut === 'VALIDE' ? 'Validé' : 'Rejeté' }}</strong>
          <span class="text-ink-soft"> par {{ document.valide_par || 'un administrateur' }} · {{ dateHeure(document.date_decision) }}</span>
        </p>
        <p v-else class="text-sm text-ink-soft">En attente de votre décision.</p>
        <p v-if="document.statut === 'REJETE' && document.motif_rejet" class="mt-1 text-sm text-ink">
          <span class="text-ink-soft">Motif :</span> {{ document.motif_rejet }}
        </p>

        <div v-if="!rejetOuvert && (peutValider || peutRejeter)" class="mt-3 flex flex-wrap gap-2">
          <MButton v-if="peutValider" size="sm" :loading="enCours" data-test="document-valider" @click="emit('valider', document)">Valider le document</MButton>
          <MButton v-if="peutRejeter" size="sm" variant="outline" :disabled="enCours" data-test="document-rejeter" @click="ouvrirRejet">Rejeter</MButton>
        </div>

        <div v-if="rejetOuvert" class="mt-3 flex flex-col gap-2">
          <label class="flex flex-col gap-1 text-xs font-semibold text-ink">
            Motif du rejet (transmis au prestataire)
            <textarea
              v-model="motif"
              rows="2"
              maxlength="500"
              class="rounded-lg border border-line-strong bg-raised px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
              data-test="document-motif"
            />
          </label>
          <p v-if="erreurMotif || erreur" class="text-xs text-danger" role="alert">{{ erreurMotif || erreur }}</p>
          <div class="flex flex-wrap justify-end gap-2">
            <MButton size="sm" variant="ghost" :disabled="enCours" @click="rejetOuvert = false">Annuler</MButton>
            <MButton size="sm" variant="danger" :loading="enCours" data-test="document-confirmer-rejet" @click="confirmerRejet">Confirmer le rejet</MButton>
          </div>
        </div>
        <p v-else-if="erreur" class="mt-2 text-xs text-danger" role="alert">{{ erreur }}</p>
      </div>
    </div>
  </article>
</template>
