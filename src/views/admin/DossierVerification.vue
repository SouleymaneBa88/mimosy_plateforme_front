<!--
  Dossier professionnel complet d'un prestataire (/admin/dossiers/:id).

  Profil · Documents soumis (aperçu, analyse automatique, décision par
  document) · Analyse IA (synthèse, cohérence) · Entretien avec Fassa ·
  Décision administrateur · Historique chronologique.

  Les analyses automatiques sont des aides : elles ne prouvent ni
  l'identité, ni l'authenticité d'un document, ni la compétence. Seule la
  décision de l'administrateur change le statut du prestataire.
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import BlocAnalyseIA from '@/components/admin/verification/BlocAnalyseIA.vue'
import DecisionAdmin from '@/components/admin/verification/DecisionAdmin.vue'
import DocumentDossier from '@/components/admin/verification/DocumentDossier.vue'
import ConstatEtDecision from '@/components/admin/verification/ConstatEtDecision.vue'
import DossierEntete from '@/components/admin/verification/DossierEntete.vue'
import EntretienDossier from '@/components/admin/verification/EntretienDossier.vue'
import HistoriqueTimeline from '@/components/admin/verification/HistoriqueTimeline.vue'
import ListePoints from '@/components/admin/verification/ListePoints.vue'
import { dateHeure } from '@/components/admin/verification/libelles'
import { MBadge, MButton, MErrorState, MLoader } from '@/components/ui'
import * as adminService from '@/services/adminService'

const props = defineProps({ id: { type: String, required: true } })

const dossier = ref(null)
const chargement = ref(true)
const erreur = ref('')
const fichiers = ref({})
const envoiDecision = ref(false)
const erreurDecision = ref('')
const actionDocument = ref('')
const erreursDocument = ref({})
const regeneration = ref(false)
const erreurRegeneration = ref('')
const decisionRef = ref(null)

// L'entretien affiché : le plus récent terminé, sinon le plus récent.
const entretien = computed(() => dossier.value?.entretiens?.find((e) => e.statut === 'TERMINE') || dossier.value?.entretiens?.[0])
const coherence = computed(() => dossier.value?.analyse_coherence)
const synthese = computed(() => dossier.value?.synthese)

function analyseCompetencePour(document) {
  const analyse = dossier.value?.analyse_competence
  if (!analyse || document.type_document === 'PIECE_IDENTITE') return null
  return !analyse.document_id || analyse.document_id === document.id ? analyse : null
}

/* ---------------------------------------------------------- fichiers */
async function chargerFichier(cle, chemin) {
  if (!chemin || fichiers.value[cle]?.url) return
  fichiers.value[cle] = { url: '', erreur: '' }
  try {
    fichiers.value[cle] = { url: await adminService.recupererFichierProtege(chemin), erreur: '' }
  } catch (e) {
    fichiers.value[cle] = { url: '', erreur: e.message }
  }
}

function libererFichiers() {
  Object.values(fichiers.value).forEach((f) => f.url && URL.revokeObjectURL(f.url))
  fichiers.value = {}
}

function chargerFichiers() {
  dossier.value.documents?.forEach((d) => chargerFichier(d.id, d.fichier_url))
  if (entretien.value?.enregistrement_url) chargerFichier('video', entretien.value.enregistrement_url)
}

/* ---------------------------------------------------------- chargement */
async function charger() {
  chargement.value = true
  erreur.value = ''
  libererFichiers()
  try {
    dossier.value = await adminService.getDossierVerification(props.id)
    chargerFichiers()
  } catch (e) {
    erreur.value = e.message
  } finally {
    chargement.value = false
  }
}

// Après une action : données à jour, sans recharger les fichiers déjà affichés
// (un document remplacé entre-temps a un nouveau contenu : on le recharge).
async function rafraichir(nouveau) {
  const anciens = Object.fromEntries((dossier.value?.documents || []).map((d) => [d.id, d.date_soumission]))
  dossier.value = nouveau || (await adminService.getDossierVerification(props.id))
  dossier.value.documents?.forEach((d) => {
    if (anciens[d.id] && anciens[d.id] !== d.date_soumission && fichiers.value[d.id]?.url) {
      URL.revokeObjectURL(fichiers.value[d.id].url)
      delete fichiers.value[d.id]
    }
  })
  chargerFichiers()
}

/* ---------------------------------------------------------- décisions */
async function decider({ decision, motif, etape }) {
  envoiDecision.value = true
  erreurDecision.value = ''
  try {
    await rafraichir(await adminService.deciderDossier(props.id, decision, motif, etape))
    decisionRef.value?.fermer()
  } catch (e) {
    erreurDecision.value = e.data?.motif?.[0] || e.data?.etape_a_reprendre?.[0] || e.data?.detail || e.message
  } finally {
    envoiDecision.value = false
  }
}

async function validerDocument(document) {
  actionDocument.value = document.id
  erreursDocument.value[document.id] = ''
  try {
    await adminService.validerDocument(document.id)
    await rafraichir()
  } catch (e) {
    erreursDocument.value[document.id] = e.data?.detail || e.message
  } finally {
    actionDocument.value = ''
  }
}

async function rejeterDocument(document, motif) {
  actionDocument.value = document.id
  erreursDocument.value[document.id] = ''
  try {
    await adminService.rejeterDocument(document.id, motif)
    await rafraichir()
  } catch (e) {
    erreursDocument.value[document.id] = e.data?.motif?.[0] || e.data?.detail || e.message
  } finally {
    actionDocument.value = ''
  }
}

async function regenerer() {
  regeneration.value = true
  erreurRegeneration.value = ''
  try {
    await rafraichir(await adminService.regenererSynthese(props.id))
  } catch (e) {
    erreurRegeneration.value = e.message
  } finally {
    regeneration.value = false
  }
}

function allerA(id) {
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' })
}

function etatCoherence(valeur, oui, non, inconnu) {
  if (valeur === true) return { ton: 'success', texte: oui }
  if (valeur === false) return { ton: 'danger', texte: non }
  return { ton: 'neutral', texte: inconnu }
}

onMounted(charger)
onBeforeUnmount(libererFichiers)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="flex flex-col gap-6">
      <router-link to="/admin/dossiers" class="flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Toutes les vérifications
      </router-link>

      <MLoader v-if="chargement" />
      <MErrorState v-else-if="erreur" :message="erreur" @retry="charger" />

      <template v-else-if="dossier">
        <DossierEntete :dossier="dossier" class="animate-rise" />
        <ConstatEtDecision :dossier="dossier" class="animate-rise" style="--reveal-delay: 80ms" @aller="allerA" />

        <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="flex min-w-0 flex-col gap-6">
            <!-- Profil déclaré -->
            <section class="rounded-card border border-line bg-surface p-5 sm:p-6">
              <h2 class="font-serif text-[22px] leading-7 text-ink">Profil professionnel déclaré</h2>
              <p class="mb-4 text-xs text-muted">Informations saisies par le prestataire avec Aby (IA), non vérifiées en elles-mêmes.</p>
              <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div><dt class="text-xs text-muted">Métier</dt><dd class="font-semibold text-ink">{{ dossier.profil?.metier || '—' }}</dd></div>
                <div><dt class="text-xs text-muted">Domaine</dt><dd class="text-ink">{{ dossier.profil?.domaine || '—' }}</dd></div>
                <div><dt class="text-xs text-muted">Expérience</dt><dd class="text-ink">{{ dossier.profil?.experience_annees ?? 0 }} an(s)</dd></div>
                <div><dt class="text-xs text-muted">Zone d'intervention</dt><dd class="text-ink">{{ dossier.profil?.zone_intervention || '—' }}</dd></div>
                <div><dt class="text-xs text-muted">Disponibilités</dt><dd class="text-ink">{{ dossier.profil?.disponibilites || '—' }}</dd></div>
                <div><dt class="text-xs text-muted">Services</dt><dd class="text-ink">{{ dossier.profil?.services?.join(', ') || '—' }}</dd></div>
                <div class="sm:col-span-2"><dt class="text-xs text-muted">Description</dt><dd class="text-ink">{{ dossier.profil?.description || '—' }}</dd></div>
              </dl>
            </section>

            <!-- Documents soumis -->
            <section id="documents" class="scroll-mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
              <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="font-serif text-[22px] leading-7 text-ink">Documents soumis</h2>
                <p class="text-xs text-muted">{{ dossier.documents?.length || 0 }} document(s) · un seul document actif par type</p>
              </div>
              <p v-if="!dossier.documents?.length" class="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-soft">
                Aucun document soumis pour le moment.
              </p>
              <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <DocumentDossier
                  v-for="document in dossier.documents"
                  :key="document.id"
                  :document="document"
                  :fichier="fichiers[document.id]"
                  :analyse-identite="document.type_document === 'PIECE_IDENTITE' ? dossier.analyse_identite : null"
                  :analyse-competence="analyseCompetencePour(document)"
                  :en-cours="actionDocument === document.id"
                  :erreur="erreursDocument[document.id] || ''"
                  @valider="validerDocument"
                  @rejeter="rejeterDocument"
                />
              </div>
            </section>

            <!-- Analyse IA du dossier -->
            <section id="analyse-ia" class="scroll-mt-6 flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="font-serif text-[22px] leading-7 text-ink">Analyse IA du dossier</h2>
                <MButton variant="ghost" size="sm" :icon="RefreshCw" :loading="regeneration" data-test="regenerer" @click="regenerer">Régénérer la synthèse</MButton>
              </div>
              <p v-if="erreurRegeneration" class="text-sm text-danger" role="alert">{{ erreurRegeneration }}</p>

              <BlocAnalyseIA
                v-if="synthese"
                titre="Synthèse du dossier"
                :agent="synthese.redige_par || ''"
                :mode="synthese.mode"
                :date="dateHeure(dossier.synthese_le)"
                avertissement="Synthèse informationnelle : aucune note, aucune recommandation. La décision finale revient à l'administrateur."
                data-test="synthese"
              >
                <p>{{ synthese.resume }}</p>
                <p v-if="synthese.coherence" class="mt-2"><span class="font-semibold">Cohérence :</span> {{ synthese.coherence }}</p>
                <dl class="mt-3 grid gap-x-3 gap-y-1 text-xs sm:grid-cols-[130px_1fr]">
                  <dt class="text-ink-soft">Profession</dt><dd>{{ synthese.profession || '—' }} ({{ synthese.domaine || 'domaine non précisé' }})</dd>
                  <dt class="text-ink-soft">Expérience déclarée</dt><dd>{{ synthese.experience_declaree || '—' }}</dd>
                  <dt class="text-ink-soft">Documents</dt>
                  <dd><span v-for="d in synthese.documents || []" :key="d.type" class="block">{{ d.type }} : {{ d.analyse }} ({{ d.statut }})</span></dd>
                </dl>
                <ListePoints class="mt-3" titre="Points à vérifier" :points="synthese.points_a_verifier" ton="warning" />
              </BlocAnalyseIA>
              <p v-else class="rounded-xl bg-sunken px-4 py-4 text-sm text-ink-soft">La synthèse est produite automatiquement à la fin de l'entretien.</p>

              <BlocAnalyseIA
                v-if="coherence"
                titre="Contrôle de cohérence (profil · documents · entretien)"
                :mode="coherence.mode"
                data-test="coherence"
              >
                <p v-if="coherence.resume">{{ coherence.resume }}</p>
                <ul class="mt-2 flex flex-wrap gap-2">
                  <li><MBadge :variant="coherence.profil_complet ? 'success' : 'warning'" size="sm">Profil {{ coherence.profil_complet ? 'complet' : 'incomplet' }}</MBadge></li>
                  <li>
                    <MBadge :variant="etatCoherence(coherence.identite_coherente, '', '', '').ton" size="sm">
                      Identité : {{ etatCoherence(coherence.identite_coherente, 'cohérente', 'différences', 'non lue').texte }}
                    </MBadge>
                  </li>
                  <li>
                    <MBadge :variant="etatCoherence(coherence.competence_coherente, '', '', '').ton" size="sm">
                      Compétence : {{ etatCoherence(coherence.competence_coherente, 'cohérence apparente', 'à vérifier', 'non déterminée').texte }}
                    </MBadge>
                  </li>
                </ul>
                <div class="mt-3 flex flex-col gap-3">
                  <ListePoints titre="Incohérences apparentes" :points="coherence.incoherences" ton="danger" />
                  <ListePoints titre="Points à vérifier" :points="coherence.points_a_verifier" ton="warning" />
                </div>
              </BlocAnalyseIA>
              <p v-else class="rounded-xl bg-sunken px-4 py-4 text-sm text-ink-soft">Le contrôle de cohérence n'a pas encore été calculé.</p>
            </section>

            <!-- Entretien -->
            <section id="entretien" class="scroll-mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
              <h2 class="mb-4 font-serif text-[22px] leading-7 text-ink">Entretien professionnel avec Fassa (IA)</h2>
              <EntretienDossier
                :entretien="entretien"
                :profil="dossier.profil"
                :video="fichiers.video"
                :nombre-entretiens="dossier.entretiens?.length || 0"
              />
            </section>
          </div>

          <!-- Décision (colonne fixe sur grand écran) -->
          <aside id="decision" class="scroll-mt-6 xl:sticky xl:top-6">
            <DecisionAdmin ref="decisionRef" :dossier="dossier" :envoi="envoiDecision" :erreur="erreurDecision" @decider="decider" />
          </aside>
        </div>

        <!-- Historique -->
        <section id="historique" class="scroll-mt-6 rounded-card border border-line bg-surface p-5 sm:p-6">
          <h2 class="font-serif text-[22px] leading-7 text-ink">Historique de vérification</h2>
          <p class="mb-4 text-xs text-muted">Chaque soumission, analyse et décision, avec sa date, son auteur et son motif.</p>
          <HistoriqueTimeline :historique="dossier.historique || []" />
        </section>
      </template>
    </div>
  </AppLayout>
</template>
