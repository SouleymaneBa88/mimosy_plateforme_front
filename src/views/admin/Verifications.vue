<script setup>
/**
 * File d'attente de vérification d'identité des prestataires.
 *
 * L'admin décide à partir du document réel (image servie par l'API, sous
 * authentification) et des résultats de la lecture automatique (OCR +
 * comparaison avec le profil, voir apps.verification.services). Cette
 * lecture n'est qu'une aide : elle peut se tromper et ne vérifie pas
 * l'authenticité du document. La page n'a donc jamais de bouton
 * « auto-valider », seulement les deux décisions humaines.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Expand, FileImage, ShieldCheck } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import { MBadge, MButton, MCard, MEmptyState, MErrorState, MInput, MLoader, MModal, MTable } from '@/components/ui'
import * as adminService from '@/services/adminService'
import { CHAMPS_EXTRAITS, LABELS_STATUT_DOCUMENT, etatAnalyseOcr } from '@/utils/verification'

const LABELS_TYPE_DOCUMENT = {
  PIECE_IDENTITE: "Pièce d'identité",
  DIPLOME: 'Diplôme',
  CERTIFICATION: 'Certification',
  DOCUMENT_PROFESSIONNEL: 'Document professionnel',
}

// Message affiché pour chaque état de la lecture automatique.
const MESSAGES_OCR = {
  en_cours: { titre: 'Analyse en cours', texte: 'Les résultats apparaîtront à la fin du traitement.' },
  non_analyse: { titre: "Aucun résultat d'analyse", texte: "Aucune lecture automatique n'est enregistrée pour ce document." },
  inconnu: {
    titre: 'État de la lecture non enregistré',
    texte: "Document analysé avant l'enregistrement de l'état de l'OCR : un champ vide peut signifier que la lecture n'a pas eu lieu.",
  },
  desactive: { titre: 'Analyse automatique non effectuée.', texte: 'La lecture automatique était désactivée lors de la soumission.' },
  erreur: {
    titre: "La lecture automatique a échoué pour une raison technique.",
    texte: "Le document n'est pas en cause : examinez directement l'image.",
  },
  aucun_texte: { titre: "Aucun texte exploitable n'a été détecté.", texte: "Examinez directement l'image du document." },
  partiel: { titre: 'Analyse partielle', texte: 'Certaines informations n’ont pas été détectées.' },
  complet: { titre: 'Lecture automatique effectuée', texte: 'Toutes les informations recherchées ont été détectées.' },
}

// Quand rien d'exploitable n'a été lu, le backend précise pourquoi
// (resultat_comparaison.ocr) : aucune carte sur la photo, ou texte lu mais
// écarté parce qu'il ne ressemble pas à une pièce d'identité.
function messageOcr(etat, document) {
  const ocr = document.resultat_comparaison?.ocr
  if (etat === 'aucun_texte' && ocr?.carte_detectee === false) {
    return { titre: "Aucune carte d'identité repérée sur la photo.", texte: "Aucune lecture n'a été tentée : examinez directement l'image." }
  }
  if (etat === 'aucun_texte' && ocr?.lecture_rejetee) {
    return {
      titre: 'Lecture automatique écartée.',
      texte: "Le texte lu ne ressemble pas à une pièce d'identité : aucune information n'en a été tirée.",
    }
  }
  return MESSAGES_OCR[etat]
}

// États pour lesquels le document a réellement été lu : on affiche alors
// ce que l'OCR a trouvé (ou « Non détecté »). Dans les autres cas, afficher
// « Non détecté » ferait croire à une lecture qui n'a pas eu lieu.
const ETATS_AVEC_LECTURE = ['partiel', 'complet', 'inconnu']

const documents = ref([])
const loading = ref(false)
const errorMessage = ref('')
const motifs = ref({})
const actionEnCours = ref('')
const erreursAction = ref({})

// Aperçus des documents : { [id]: { url, loading, erreur } }. Les URL sont
// locales (blob en mémoire) et révoquées dès que le document quitte l'écran.
const apercus = ref({})
const documentAgrandi = ref(null)

async function chargerApercu(document) {
  apercus.value[document.id] = { url: '', loading: true, erreur: '' }
  try {
    const url = await adminService.recupererFichierDocument(document.id)
    apercus.value[document.id] = { url, loading: false, erreur: '' }
  } catch (error) {
    apercus.value[document.id] = { url: '', loading: false, erreur: error.message }
  }
}

function libererApercu(id) {
  const url = apercus.value[id]?.url
  if (url) URL.revokeObjectURL(url)
  delete apercus.value[id]
}

function libererTousLesApercus() {
  Object.keys(apercus.value).forEach(libererApercu)
}

async function charger() {
  loading.value = true
  errorMessage.value = ''
  libererTousLesApercus()
  try {
    documents.value = await adminService.listDocumentsAVerifier()
    documents.value.forEach(chargerApercu)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

function retirerDocument(id) {
  documents.value = documents.value.filter((item) => item.id !== id)
  if (documentAgrandi.value?.id === id) documentAgrandi.value = null
  libererApercu(id)
}

async function valider(document) {
  actionEnCours.value = document.id
  erreursAction.value[document.id] = ''
  try {
    await adminService.validerDocument(document.id)
    retirerDocument(document.id)
  } catch (error) {
    erreursAction.value[document.id] = error.message
  } finally {
    actionEnCours.value = ''
  }
}

async function rejeter(document) {
  const motif = (motifs.value[document.id] || '').trim()
  if (!motif) {
    erreursAction.value[document.id] = 'Un motif est requis pour rejeter un document.'
    return
  }

  actionEnCours.value = document.id
  erreursAction.value[document.id] = ''
  try {
    await adminService.rejeterDocument(document.id, motif)
    retirerDocument(document.id)
  } catch (error) {
    erreursAction.value[document.id] = error.message
  } finally {
    actionEnCours.value = ''
  }
}

// ── Mise en forme (aucune donnée ajoutée, uniquement l'affichage) ──────────

function formaterDateHeure(valeur) {
  if (!valeur) return ''
  return new Date(valeur).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

// Dates renvoyées au format ISO (AAAA-MM-JJ) par le backend.
function formaterDateIso(valeur) {
  const morceaux = String(valeur || '').split('-')
  return morceaux.length === 3 ? `${morceaux[2]}/${morceaux[1]}/${morceaux[0]}` : valeur
}

function valeurLisible(valeur, champ) {
  if (valeur == null || valeur === '') return null
  return champ.date ? formaterDateIso(valeur) : String(valeur)
}

function resultatComparaison(champCompare) {
  if (!champCompare) return { variant: 'neutral', label: 'Non comparé' }
  if (!champCompare.verifiable) return { variant: 'neutral', label: 'Non vérifiable' }
  return champCompare.correspond
    ? { variant: 'success', label: 'Correspond' }
    : { variant: 'danger', label: 'Ne correspond pas' }
}

// Une ligne par information : valeur déclarée (profil, uniquement pour les
// champs comparés par le backend), valeur lue, résultat de la comparaison.
function lignesInformations(document) {
  const champsCompares = document.resultat_comparaison?.champs || {}
  const donnees = document.donnees_extraites || {}

  return CHAMPS_EXTRAITS.map((champ) => {
    const compare = champsCompares[champ.cle]
    return {
      id: champ.cle,
      champ: champ.label,
      feminin: Boolean(champ.feminin),
      estCompare: Boolean(compare),
      profil: compare ? valeurLisible(compare.profil, champ) : null,
      document: valeurLisible(donnees[champ.cle], champ),
      resultat: resultatComparaison(compare),
    }
  })
}

function colonnesInformations(avecLecture) {
  const colonnes = [
    { key: 'champ', label: 'Information', primary: true },
    { key: 'profil', label: 'Déclaré (profil)' },
  ]
  if (avecLecture) {
    colonnes.push({ key: 'document', label: 'Lu sur le document' }, { key: 'resultat', label: 'Comparaison' })
  }
  return colonnes
}

function champsDetectes(document) {
  const donnees = document.donnees_extraites || {}
  return CHAMPS_EXTRAITS.map((champ) => {
    const detecte = donnees[champ.cle] != null && donnees[champ.cle] !== ''
    const accord = champ.feminin ? 'e' : ''
    return { label: champ.label, detecte, etat: detecte ? `détecté${accord}` : `non détecté${accord}` }
  })
}

// Score calculé par le backend (moyenne des ressemblances sur les champs
// comparables), affiché tel quel en pourcentage, sans niveau déduit.
function scoreEnPourcentage(score) {
  return `${Math.round(score * 100)} %`
}

const vueDocuments = computed(() =>
  documents.value.map((document) => {
    const etat = document.type_document === 'PIECE_IDENTITE' ? etatAnalyseOcr(document) : null
    const avecLecture = ETATS_AVEC_LECTURE.includes(etat)
    return {
      document,
      etat,
      message: etat ? messageOcr(etat, document) : null,
      texteBrut: document.resultat_comparaison?.ocr?.texte_brut || '',
      avecLecture,
      lignes: lignesInformations(document),
      colonnes: colonnesInformations(avecLecture),
      detectes: etat === 'partiel' ? champsDetectes(document) : [],
    }
  }),
)

onMounted(charger)
onBeforeUnmount(libererTousLesApercus)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full flex-col gap-6">
      <ClientHeader title="Vérifications d'identité" subtitle="Documents en attente de décision." />

      <MCard v-if="loading"><MLoader variant="skeleton" :lines="5" label="Chargement des documents…" /></MCard>

      <MErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />

      <MEmptyState
        v-else-if="!documents.length"
        :icon="ShieldCheck"
        title="Aucune vérification en attente"
        description="Les nouveaux documents soumis apparaîtront ici."
      />

      <div v-else class="grid gap-5">
        <MCard v-for="item in vueDocuments" :key="item.document.id" tone="raised" as="article">
          <!-- En-tête : prestataire, type, statut, dates -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-ink">{{ item.document.prestataire_nom || 'Prestataire' }}</h2>
              <p class="mt-1 text-[13px] text-ink-soft">
                Soumis le {{ formaterDateHeure(item.document.date_soumission) }}
                <template v-if="item.document.date_analyse_debut">
                  · Analyse lancée le {{ formaterDateHeure(item.document.date_analyse_debut) }}
                </template>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <MBadge variant="neutral">{{ LABELS_TYPE_DOCUMENT[item.document.type_document] || item.document.type_document }}</MBadge>
              <MBadge :status="item.document.statut" :label="LABELS_STATUT_DOCUMENT[item.document.statut]" />
            </div>
          </div>

          <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <!-- Document original -->
            <section aria-label="Document soumis" class="flex flex-col gap-2">
              <div class="relative flex min-h-55 items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken">
                <MLoader v-if="apercus[item.document.id]?.loading" label="Chargement du document…" />
                <MErrorState
                  v-else-if="apercus[item.document.id]?.erreur"
                  compact
                  class="m-3 w-full"
                  title="Document non affichable"
                  :message="apercus[item.document.id].erreur"
                  @retry="chargerApercu(item.document)"
                />
                <img
                  v-else-if="apercus[item.document.id]?.url"
                  :src="apercus[item.document.id].url"
                  :alt="`${LABELS_TYPE_DOCUMENT[item.document.type_document] || 'Document'} soumis par ${item.document.prestataire_nom || 'le prestataire'}`"
                  class="max-h-85 w-full object-contain"
                />
                <FileImage v-else :size="22" :stroke-width="1.6" class="text-muted" aria-hidden="true" />
              </div>
              <MButton
                v-if="apercus[item.document.id]?.url"
                variant="ghost"
                size="sm"
                :icon="Expand"
                class="self-start"
                @click="documentAgrandi = item.document"
              >
                Agrandir le document
              </MButton>
            </section>

            <!-- Résultats -->
            <section aria-label="Informations du document" class="flex min-w-0 flex-col gap-4">
              <!-- Seule la pièce d'identité passe par l'OCR (apps.verification.services.analyser_document). -->
              <p v-if="item.document.type_document !== 'PIECE_IDENTITE'" class="text-sm text-ink-soft">
                Ce type de document n'est pas analysé automatiquement : examen humain direct.
              </p>

              <template v-else>
                <!-- État de la lecture automatique -->
                <div class="rounded-xl border border-line bg-surface p-4">
                  <p class="text-sm font-semibold text-ink">{{ item.message.titre }}</p>
                  <p class="mt-1 text-[13px] leading-5 text-ink-soft">{{ item.message.texte }}</p>

                  <ul v-if="item.detectes.length" class="mt-3 flex flex-wrap gap-1.5" aria-label="Informations détectées">
                    <li v-for="champ in item.detectes" :key="champ.label">
                      <MBadge size="sm" :variant="champ.detecte ? 'success' : 'neutral'">
                        {{ champ.label }} : {{ champ.etat }}
                      </MBadge>
                    </li>
                  </ul>
                </div>

                <!-- Déclaré / lu / comparaison -->
                <MTable :columns="item.colonnes" :rows="item.lignes" :caption="`Informations de ${item.document.prestataire_nom || 'ce prestataire'}`">
                  <template #cell-profil="{ row }">
                    <span v-if="row.profil" class="text-ink">{{ row.profil }}</span>
                    <span v-else-if="row.estCompare" class="text-muted">Non renseigné</span>
                    <span v-else class="text-muted">Non déclaré au profil</span>
                  </template>
                  <template #cell-document="{ row }">
                    <span v-if="row.document" class="break-all font-medium text-ink">{{ row.document }}</span>
                    <span v-else class="text-muted">{{ row.feminin ? 'Non détectée' : 'Non détecté' }}</span>
                  </template>
                  <template #cell-resultat="{ row }">
                    <MBadge size="sm" :variant="row.resultat.variant">{{ row.resultat.label }}</MBadge>
                  </template>
                </MTable>

                <p v-if="item.document.score_correspondance != null" class="text-[13px] text-ink-soft">
                  Score de correspondance :
                  <span class="tabular font-semibold text-ink">{{ scoreEnPourcentage(item.document.score_correspondance) }}</span>
                  — moyenne de ressemblance sur les champs comparables (nom, prénom, date de naissance).
                </p>

                <details v-if="item.texteBrut" class="rounded-xl border border-line bg-surface px-4 py-3 text-[13px]">
                  <summary class="cursor-pointer font-medium text-ink-soft">Texte brut lu par l'OCR (audit)</summary>
                  <pre class="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-ink">{{ item.texteBrut }}</pre>
                  <p class="mt-2 text-[12px] text-muted">Donnée de diagnostic uniquement : ce texte n'est pas une preuve d'authenticité.</p>
                </details>

                <p v-if="item.avecLecture" class="text-[12px] leading-5 text-muted">
                  Lecture automatique indicative, qui peut contenir des erreurs : comparez toujours avec l'image.
                  Aucun contrôle d'authenticité du document n'est effectué.
                </p>
              </template>
            </section>
          </div>

          <!-- Décision -->
          <template #footer>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
              <MButton :loading="actionEnCours === item.document.id" :disabled="!!actionEnCours" @click="valider(item.document)">
                Valider
              </MButton>
              <MInput
                v-model="motifs[item.document.id]"
                label="Motif du rejet"
                hide-label
                placeholder="Motif du rejet"
                class="flex-1"
              />
              <MButton variant="outline" :disabled="!!actionEnCours" @click="rejeter(item.document)">
                Rejeter
              </MButton>
            </div>
            <p v-if="erreursAction[item.document.id]" class="mt-2 text-[13px] text-danger" role="alert">
              {{ erreursAction[item.document.id] }}
            </p>
          </template>
        </MCard>
      </div>
    </div>

    <MModal
      :model-value="Boolean(documentAgrandi)"
      size="xl"
      :title="documentAgrandi ? `Document de ${documentAgrandi.prestataire_nom || 'ce prestataire'}` : ''"
      @update:model-value="(ouvert) => { if (!ouvert) documentAgrandi = null }"
    >
      <img
        v-if="documentAgrandi && apercus[documentAgrandi.id]?.url"
        :src="apercus[documentAgrandi.id].url"
        :alt="`Document soumis par ${documentAgrandi.prestataire_nom || 'le prestataire'}`"
        class="mx-auto max-h-[75vh] w-auto object-contain"
      />
    </MModal>
  </AppLayout>
</template>
