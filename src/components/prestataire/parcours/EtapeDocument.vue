<!--
  Étapes 2 et 3 : pièce d'identité et justificatif professionnel.
  Choix du fichier → aperçu → (retirer ou remplacer avant l'envoi) → envoi
  → état d'analyse. Les contrôles ci-dessous (format, taille) évitent un
  aller-retour inutile ; le backend revérifie tout (contenu réel du fichier).
-->
<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { FileText, ImagePlus, Trash2, Upload } from 'lucide-vue-next'

import { MBadge, MButton } from '@/components/ui'
import * as verificationService from '@/services/verificationService'

const props = defineProps({
  // 'identite' ou 'justificatif'
  sorte: { type: String, required: true },
  // Document déjà envoyé (renvoyé par GET /parcours/), ou null.
  document: { type: Object, default: null },
})
const emit = defineEmits(['envoye'])

const TAILLE_MAX = 5 * 1024 * 1024
const estIdentite = computed(() => props.sorte === 'identite')
const formats = computed(() => (estIdentite.value ? ['image/jpeg', 'image/png'] : ['image/jpeg', 'image/png', 'application/pdf']))
const TYPES_JUSTIFICATIF = [
  { valeur: 'DIPLOME', libelle: 'Diplôme' },
  { valeur: 'CERTIFICATION', libelle: 'Certificat' },
  { valeur: 'DOCUMENT_PROFESSIONNEL', libelle: 'Attestation ou autre justificatif' },
]

const fichier = ref(null)
const apercu = ref('')
const typeJustificatif = ref(props.document?.type_document && props.document.type_document !== 'PIECE_IDENTITE'
  ? props.document.type_document
  : 'DIPLOME')
const erreur = ref('')
const envoi = ref(false)
const champFichier = ref(null)

function liberer() {
  if (apercu.value) URL.revokeObjectURL(apercu.value)
  apercu.value = ''
}

function choisir(evenement) {
  erreur.value = ''
  const choisi = evenement.target.files?.[0]
  evenement.target.value = ''
  if (!choisi) return
  if (!formats.value.includes(choisi.type)) {
    erreur.value = estIdentite.value ? 'Formats acceptés : JPEG ou PNG.' : 'Formats acceptés : JPEG, PNG ou PDF.'
    return
  }
  if (choisi.size > TAILLE_MAX) {
    erreur.value = 'Le fichier ne doit pas dépasser 5 Mo.'
    return
  }
  liberer()
  fichier.value = choisi
  if (choisi.type.startsWith('image/')) apercu.value = URL.createObjectURL(choisi)
}

function retirer() {
  liberer()
  fichier.value = null
}

async function envoyer() {
  if (!fichier.value) return
  envoi.value = true
  erreur.value = ''
  try {
    await verificationService.soumettreDocument(
      fichier.value,
      estIdentite.value ? 'PIECE_IDENTITE' : typeJustificatif.value,
    )
    retirer()
    emit('envoye')
  } catch (e) {
    erreur.value = e.data?.fichier || e.message
  } finally {
    envoi.value = false
  }
}

onBeforeUnmount(liberer)

const TONS = { EN_ANALYSE: 'warning', A_VERIFIER: 'info', VALIDE: 'success', REJETE: 'danger' }
</script>

<template>
  <section class="flex flex-col gap-4 border border-[#E5E7E2] bg-white p-5 sm:p-6">
    <!-- Document déjà envoyé -->
    <div v-if="document" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FAFAF8] p-4">
      <div class="flex items-center gap-3">
        <FileText class="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
        <div>
          <p class="text-sm font-bold text-[#1C2420]">{{ document.type_libelle }} envoyé</p>
          <p class="text-xs text-[#4F5A54]">
            {{ document.statut === 'EN_ANALYSE' ? 'Analyse automatique en cours…' : 'Reçu : il sera examiné avec votre dossier.' }}
          </p>
        </div>
      </div>
      <MBadge :variant="TONS[document.statut] || 'neutral'" data-test="statut-document">{{ document.statut_libelle }}</MBadge>
      <p v-if="document.statut === 'REJETE' && document.motif_rejet" class="w-full text-sm text-[#A4443A]">
        Motif : {{ document.motif_rejet }}. Merci d'envoyer un nouveau document.
      </p>
    </div>

    <label v-if="!estIdentite" class="flex flex-col gap-1 text-sm font-semibold text-[#1C2420]">
      Type de justificatif
      <select v-model="typeJustificatif" class="h-11 rounded-xl border border-[#D3D7D0] bg-white px-3 font-normal">
        <option v-for="t in TYPES_JUSTIFICATIF" :key="t.valeur" :value="t.valeur">{{ t.libelle }}</option>
      </select>
    </label>

    <!-- Fichier choisi, pas encore envoyé : aperçu, retrait, remplacement -->
    <div v-if="fichier" class="flex flex-col gap-3 rounded-lg border border-[#D3D7D0] p-4" data-test="fichier-choisi">
      <img v-if="apercu" :src="apercu" alt="Aperçu du document choisi" class="max-h-56 w-auto self-start rounded border border-[#E5E7E2]" />
      <p class="text-sm text-[#1C2420]">{{ fichier.name }} · {{ Math.ceil(fichier.size / 1024) }} Ko</p>
      <div class="flex flex-wrap gap-2">
        <MButton :icon="Upload" :loading="envoi" data-test="envoyer-document" @click="envoyer">Envoyer ce document</MButton>
        <MButton variant="outline" :icon="ImagePlus" @click="champFichier.click()">Remplacer</MButton>
        <MButton variant="ghost" :icon="Trash2" data-test="retirer-document" @click="retirer">Retirer</MButton>
      </div>
    </div>

    <MButton v-else variant="outline" :icon="ImagePlus" @click="champFichier.click()">
      {{ document ? 'Remplacer le document' : 'Choisir un fichier' }}
    </MButton>

    <input
      ref="champFichier"
      type="file"
      class="sr-only"
      :accept="formats.join(',')"
      data-test="champ-fichier"
      @change="choisir"
    />
    <p class="text-xs text-[#7A847E]">
      {{ estIdentite ? 'Photo nette, JPEG ou PNG' : 'JPEG, PNG ou PDF' }}, 5 Mo maximum.
      Le document n'est visible que par vous et l'équipe MIMOSY.
    </p>
    <p v-if="erreur" class="text-sm text-[#A4443A]" role="alert" data-test="erreur-document">{{ erreur }}</p>
  </section>
</template>
