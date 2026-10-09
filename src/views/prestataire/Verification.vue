<script setup>
/**
 * Vérification d'identité du prestataire.
 *
 * Workflow backend :
 *   Soumission CNI (scanner ou photo) → EN_ANALYSE (202 immédiat)
 *   → thread TrOCR en arrière-plan
 *   → A_VERIFIER + notification
 *   → décision admin (VALIDE ou REJETE)
 *
 * Deux méthodes d'envoi partagent exactement le même endpoint :
 *   - Scanner caméra (navigator.mediaDevices.getUserMedia)
 *   - Ajouter une photo (input[type=file])
 */
// Outils Vue et icônes.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Camera, Clock, FileCheck2, ImagePlus, RefreshCw, ScrollText, ShieldQuestion, X } from 'lucide-vue-next'

// Composants, store du profil, toasts, API de vérification, et outils d'affichage de la vérification.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import Loader from '@/components/common/Loader.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useToast } from '@/composables/useToast'
import * as verificationService from '@/services/verificationService'
import {
  CLASSES_ETAT_CHAMP,
  CLASSES_STATUT_DOCUMENT,
  LABELS_CHAMP_COMPARAISON,
  LABELS_ETAT_CHAMP,
  LABELS_STATUT_DOCUMENT,
  analyseEffectuee,
  analyseCourante,
  iaEtaitDesactivee,
  etatChampComparaison,
  niveauConfiance as calculerNiveauConfiance,
} from '@/utils/verification'
import { useEvenementTempsReel } from '@/composables/useEvenementTempsReel'

// Le store du profil et les fonctions de toast.
const profileStore = useClientProfilStore()
const { erreur, succes } = useToast()

/* -------------------------------------------------------------------------- */
/* Types de documents facultatifs                                             */
/* -------------------------------------------------------------------------- */

// Les documents facultatifs que le prestataire peut ajouter.
const DOCUMENTS_FACULTATIFS = [
  { value: 'DIPLOME',                label: 'Diplôme',                description: 'Diplôme attestant de votre formation dans votre domaine.' },
  { value: 'CERTIFICATION',          label: 'Certification',          description: 'Certification professionnelle reconnue dans votre métier.' },
  { value: 'DOCUMENT_PROFESSIONNEL', label: 'Document professionnel', description: 'Tout autre justificatif professionnel utile à votre vérification.' },
]

// Raccourcis vers les libellés et couleurs des statuts.
const LABELS_STATUT  = LABELS_STATUT_DOCUMENT
const CLASSES_STATUT = CLASSES_STATUT_DOCUMENT

/* -------------------------------------------------------------------------- */
/* État global                                                                */
/* -------------------------------------------------------------------------- */

// Chargement, erreur, documents (rangés par type), et type en cours d'envoi.
const loading      = ref(true)
const errorMessage = ref('')
const documents    = ref({})
const envoiEnCours = ref('')

/* -------------------------------------------------------------------------- */
/* Calculs sur la pièce d'identité                                           */
/* -------------------------------------------------------------------------- */

// Le document "pièce d'identité" (ou un objet vide).
const documentIdentite = computed(() =>
  documents.value.PIECE_IDENTITE || { statut: 'NON_SOUMIS' }
)

// Informations calculées sur l'analyse de la pièce d'identité :
// en cours ? résultats disponibles ? IA désactivée ? comparaison des champs ? niveau de confiance ?
const enAnalyse           = computed(() => analyseCourante(documentIdentite.value))
const ocRResultatsDisponibles = computed(() => analyseEffectuee(documentIdentite.value))
const iaDesactiveeMessage = computed(() => iaEtaitDesactivee(documentIdentite.value))
const champsComparaison   = computed(() => documentIdentite.value.resultat_comparaison?.champs || null)
const niveauConfiance     = computed(() => calculerNiveauConfiance(documentIdentite.value.score_correspondance))
// Le prestataire peut-il (re)soumettre sa pièce d'identité ?
const peutSoumettreCNI    = computed(() =>
  ['NON_SOUMIS', 'REJETE'].includes(documentIdentite.value.statut)
)

/* -------------------------------------------------------------------------- */
/* Scanner caméra                                                             */
/* -------------------------------------------------------------------------- */

// Scanner caméra : ouvert ? balise vidéo, canevas de capture, photo prise, aperçu, erreur, flux vidéo.
const scannerOuvert    = ref(false)
const videoRef         = ref(null)
const canvasRef        = ref(null)
const photoCapturee    = ref(null)   // Blob de la photo capturée
const photoUrl         = ref('')     // URL objet pour l'aperçu
const erreurCamera     = ref('')
let   streamActif      = null

// Ouvre la caméra du navigateur.
async function ouvrirScanner() {
  erreurCamera.value = ''
  photoCapturee.value = null
  photoUrl.value = ''
  scannerOuvert.value = true

  await new Promise(r => setTimeout(r, 50))   // laisser le DOM monter la modale

  try {
    streamActif = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    if (videoRef.value) {
      videoRef.value.srcObject = streamActif
    }
  } catch (e) {
    erreurCamera.value =
      e.name === 'NotAllowedError'
        ? 'Permission caméra refusée. Utilisez « Ajouter une photo » à la place.'
        : `Impossible d'accéder à la caméra : ${e.message}`
    arreterStream()
  }
}

// Arrête la caméra.
function arreterStream() {
  if (streamActif) {
    streamActif.getTracks().forEach(t => t.stop())
    streamActif = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

// Ferme le scanner.
function fermerScanner() {
  arreterStream()
  scannerOuvert.value  = false
  photoCapturee.value  = null
  photoUrl.value       = ''
  erreurCamera.value   = ''
}

// Prend la photo : on copie l'image de la vidéo dans le canevas.
function capturer() {
  const video  = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return

  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)

  canvas.toBlob(blob => {
    photoCapturee.value = blob
    photoUrl.value      = URL.createObjectURL(blob)
    arreterStream()
  }, 'image/jpeg', 0.92)
}

// Reprendre une nouvelle photo.
function reprendreCapture() {
  photoCapturee.value = null
  if (photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value)
    photoUrl.value = ''
  }
  // Relancer le stream
  ouvrirScanner()
}

// Envoie la photo prise.
async function utiliserPhoto() {
  if (!photoCapturee.value) return
  const fichier = new File([photoCapturee.value], 'cni_scan.jpg', { type: 'image/jpeg' })
  fermerScanner()
  await soumettreFichier('PIECE_IDENTITE', fichier)
}

// S'assurer que la caméra est arrêtée si le composant est démonté.
onUnmounted(() => arreterStream())

/* -------------------------------------------------------------------------- */
/* Sélection photo depuis fichier                                             */
/* -------------------------------------------------------------------------- */

// Envoi d'un fichier : aperçu et fichier choisi.
const photoPreview  = ref('')
const fichierChoisi = ref(null)

// Appelée quand un fichier est choisi.
function surSelectionFichier(event, type) {
  const fichier = event.target.files?.[0]
  if (!fichier) return

  if (type === 'PIECE_IDENTITE') {
    // Aperçu avant envoi
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = URL.createObjectURL(fichier)
    fichierChoisi.value = { fichier, type }
  } else {
    // Documents facultatifs : envoi direct sans aperçu
    soumettreFichier(type, fichier)
    event.target.value = ''
  }
}

// Confirme l'envoi du fichier choisi.
async function confirmerEnvoiPhoto() {
  if (!fichierChoisi.value) return
  const { fichier, type } = fichierChoisi.value
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
  }
  fichierChoisi.value = null
  await soumettreFichier(type, fichier)
}

// Annule l'aperçu.
function annulerPreview() {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoPreview.value  = ''
  fichierChoisi.value = null
}

/* -------------------------------------------------------------------------- */
/* Envoi commun                                                               */
/* -------------------------------------------------------------------------- */

// Envoie un fichier au serveur pour un type de document.
async function soumettreFichier(type, fichier) {
  envoiEnCours.value = type
  try {
    const doc = await verificationService.soumettreDocument(fichier, type)
    documents.value = { ...documents.value, [type]: doc }
    if (type === 'PIECE_IDENTITE') {
      succes('Document envoyé. L\'analyse est en cours.')
    }
  } catch (err) {
    erreur(err.message)
  } finally {
    envoiEnCours.value = ''
  }
}

// Wrapper pour les inputs file (event-based)
async function soumettre(type, event) {
  const fichier = event.target.files?.[0]
  if (!fichier) return
  event.target.value = ''
  await soumettreFichier(type, fichier)
}

/* -------------------------------------------------------------------------- */
/* Chargement                                                                 */
/* -------------------------------------------------------------------------- */

// Charge tous les documents du prestataire.
async function charger() {
  loading.value = true
  errorMessage.value = ''
  try {
    const liste = await verificationService.getMesDocuments()
    const parType = {}
    liste.forEach(doc => { parType[doc.type_document] = doc })
    documents.value = parType
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}

// Au montage : on charge le profil et les documents.
onMounted(async () => {
  await profileStore.chargerProfil().catch(() => {})
  await charger()
})

// On recharge quand l'analyse avance ou qu'une décision est prise (temps réel).
useEvenementTempsReel(
  ['verification.analyse', 'verification.a_verifier', 'verification.validee', 'verification.rejetee'],
  () => charger(),
)
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div class="mx-auto flex w-full flex-col gap-8">
      <ClientHeader
        title="Vérification d'identité"
        subtitle="Un document validé par MIMOSY affiche le badge « Profil vérifié » sur votre page publique."
      />

      <Loader v-if="loading" />
      <p v-else-if="errorMessage" class="rounded-xl bg-[#FFF0EE] p-4 text-sm text-[#A85148]">
        {{ errorMessage }}
      </p>

      <template v-else>
        <!-- ==============================================================
             OBLIGATOIRE — PIÈCE D'IDENTITÉ
        ============================================================== -->
        <section class="flex flex-col gap-3">
          <p class="text-xs font-bold uppercase tracking-[0.08em] text-[#2D6A4F]">Obligatoire</p>

          <article class="border border-[#E5E7E2] bg-white p-6">

            <!-- En-tête : titre + badge statut -->
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex gap-3">
                <FileCheck2 class="mt-0.5 h-5 w-5 shrink-0 text-[#2D6A4F]" />
                <div>
                  <h2 class="font-extrabold text-[#051F20]">Pièce d'identité</h2>
                  <p class="mt-1 max-w-xl text-sm text-[#68716C]">
                    Carte nationale d'identité ou passeport. Analysée automatiquement,
                    puis vérifiée par un administrateur MIMOSY.
                  </p>
                </div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-bold"
                :class="CLASSES_STATUT[documentIdentite.statut]"
              >
                {{ LABELS_STATUT[documentIdentite.statut] }}
              </span>
            </div>

            <!-- Motif de rejet (hors erreurs techniques) -->
            <p
              v-if="documentIdentite.statut === 'REJETE' && documentIdentite.motif_rejet && !documentIdentite.motif_rejet.startsWith('[ERREUR TECHNIQUE]')"
              class="mt-4 text-sm text-[#A85148]"
            >
              Motif du refus : {{ documentIdentite.motif_rejet }}
            </p>

            <!-- ── EN_ANALYSE : bannière "Vérification en cours" ──────── -->
            <div
              v-if="enAnalyse"
              class="mt-5 flex items-start gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4"
              role="status"
              aria-live="polite"
            >
              <Clock class="mt-0.5 h-5 w-5 shrink-0 text-[#9A723C]" />
              <div>
                <p class="text-sm font-bold text-[#7C5C2A]">Analyse automatique en cours</p>
                <p class="mt-1 text-sm text-[#9A723C]">
                  Votre document est actuellement analysé.
                  Cette vérification peut prendre jusqu'à 24 heures.
                  Vous serez informé lorsque la décision sera disponible.
                </p>
                <p class="mt-2 text-xs text-[#B08040]">
                  L'analyse automatique aide à la lecture et à la comparaison des
                  informations du document. La décision finale reste prise par un
                  administrateur MIMOSY.
                </p>
              </div>
            </div>

            <!-- ── A_VERIFIER + IA désactivée ─────────────────────────── -->
            <div
              v-else-if="iaDesactiveeMessage"
              class="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
            >
              <p class="text-sm font-bold text-[#051F20]">Analyse automatique indisponible</p>
              <p class="mt-1 text-sm text-[#68716C]">
                L'analyse automatique des documents est actuellement désactivée.
                Votre document sera examiné directement par l'équipe MIMOSY.
              </p>
            </div>

            <!-- ── A_VERIFIER / VALIDE / REJETE + résultats OCR ────────── -->
            <div
              v-else-if="ocRResultatsDisponibles && champsComparaison"
              class="mt-5 border-t border-[#E5E7E2] pt-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-bold text-[#051F20]">Résultat de l'analyse automatique</p>
                <p v-if="niveauConfiance" class="text-xs font-bold text-[#68716C]">
                  Niveau de confiance : <span class="text-[#051F20]">{{ niveauConfiance }}</span>
                </p>
              </div>
              <p class="mt-1 text-xs text-[#94A3B8]">
                Comparaison entre les informations lisibles sur le document et celles de
                votre compte. Une décision humaine reste nécessaire dans tous les cas.
              </p>
              <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div
                  v-for="(champ, cle) in champsComparaison"
                  :key="cle"
                  class="border border-[#E2E8F0] p-3"
                >
                  <dt class="text-xs font-bold uppercase tracking-[0.04em] text-[#94A3B8]">
                    {{ LABELS_CHAMP_COMPARAISON[cle] || cle }}
                  </dt>
                  <dd class="mt-2">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"
                      :class="CLASSES_ETAT_CHAMP[etatChampComparaison(champ)]"
                    >
                      {{ LABELS_ETAT_CHAMP[etatChampComparaison(champ)] }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- ── Aperçu avant envoi (photo sélectionnée) ─────────────── -->
            <div v-if="fichierChoisi && photoPreview" class="mt-5 rounded-xl border border-[#E5E7E2] p-4">
              <p class="mb-3 text-sm font-bold text-[#051F20]">Aperçu du document</p>
              <img
                :src="photoPreview"
                alt="Aperçu de la pièce d'identité"
                class="max-h-56 w-full rounded-lg object-contain"
              />
              <div class="mt-4 flex gap-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#24573F] disabled:opacity-60"
                  :disabled="!!envoiEnCours"
                  @click="confirmerEnvoiPhoto"
                >
                  {{ envoiEnCours ? 'Envoi...' : 'Envoyer ce document' }}
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-[#E5E7E2] px-4 py-2.5 text-sm font-bold text-[#68716C] transition hover:bg-[#F8FAFC]"
                  :disabled="!!envoiEnCours"
                  @click="annulerPreview"
                >
                  Annuler
                </button>
              </div>
            </div>

            <!-- ── Boutons d'envoi (NON_SOUMIS ou REJETE) ──────────────── -->
            <template v-if="peutSoumettreCNI && !fichierChoisi">
              <div class="mt-5 flex flex-col gap-3 sm:flex-row">
                <!-- Scanner -->
                <button
                  type="button"
                  class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#2D6A4F] px-5 py-3 text-sm font-bold text-[#2D6A4F] transition hover:bg-[#EAF8F2] disabled:opacity-60"
                  :disabled="!!envoiEnCours"
                  @click="ouvrirScanner"
                >
                  <Camera class="h-4 w-4" />
                  Scanner ma carte
                </button>

                <!-- Ajouter une photo -->
                <label
                  class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24573F]"
                  :class="{ 'pointer-events-none opacity-60': !!envoiEnCours }"
                >
                  <ImagePlus class="h-4 w-4" />
                  Ajouter une photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    class="hidden"
                    :disabled="!!envoiEnCours"
                    @change="surSelectionFichier($event, 'PIECE_IDENTITE')"
                  />
                </label>
              </div>
              <p class="mt-2 text-xs text-[#94A3B8]">
                Formats acceptés : JPEG ou PNG. Taille maximale : 5 Mo.
              </p>
            </template>

          </article>
        </section>

        <!-- ==============================================================
             OBLIGATOIRE — CGU
        ============================================================== -->
        <section class="flex flex-col gap-3">
          <p class="text-xs font-bold uppercase tracking-[0.08em] text-[#2D6A4F]">Obligatoire</p>
          <article class="border border-[#E5E7E2] bg-white p-6">
            <div class="flex gap-3">
              <ScrollText class="mt-0.5 h-5 w-5 shrink-0 text-[#68716C]" />
              <div>
                <h2 class="font-extrabold text-[#051F20]">Conditions Générales d'Utilisation</h2>
                <p class="mt-2 max-w-xl text-sm text-[#68716C]">
                  L'acceptation des CGU sera intégrée à ce parcours lorsque le mécanisme
                  d'enregistrement sera disponible côté serveur. Cette étape n'est pas encore active.
                </p>
              </div>
            </div>
          </article>
        </section>

        <!-- ==============================================================
             FACULTATIF — DOCUMENTS COMPLÉMENTAIRES
        ============================================================== -->
        <section class="flex flex-col gap-3">
          <p class="text-xs font-bold uppercase tracking-[0.08em] text-[#68716C]">Facultatif</p>
          <p class="text-sm text-[#68716C]">
            Ces justificatifs ne sont pas nécessaires pour obtenir la vérification de votre identité.
            Ils renforcent votre crédibilité auprès des clients, mais restent optionnels.
          </p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article
              v-for="type in DOCUMENTS_FACULTATIFS"
              :key="type.value"
              class="border border-[#E5E7E2] bg-[#FAFAF8] p-5"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-sm font-bold text-[#051F20]">{{ type.label }}</h3>
                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  :class="CLASSES_STATUT[documents[type.value]?.statut || 'NON_SOUMIS']"
                >
                  {{ LABELS_STATUT[documents[type.value]?.statut || 'NON_SOUMIS'] }}
                </span>
              </div>
              <p class="mt-2 text-xs leading-5 text-[#68716C]">{{ type.description }}</p>
              <p
                v-if="documents[type.value]?.statut === 'REJETE' && documents[type.value]?.motif_rejet && !documents[type.value].motif_rejet.startsWith('[ERREUR TECHNIQUE]')"
                class="mt-2 text-xs text-[#A85148]"
              >
                Motif du refus : {{ documents[type.value].motif_rejet }}
              </p>
              <p
                v-if="documents[type.value]?.statut === 'EN_ANALYSE'"
                class="mt-3 text-xs text-[#9A723C]"
              >
                Analyse en cours…
              </p>
              <label
                v-if="['NON_SOUMIS', 'REJETE'].includes(documents[type.value]?.statut || 'NON_SOUMIS')"
                class="mt-3 inline-block cursor-pointer rounded-lg border border-[#2D6A4F] px-3 py-2 text-xs font-bold text-[#2D6A4F] transition hover:bg-[#EAF8F2]"
                :class="{ 'pointer-events-none opacity-60': envoiEnCours === type.value }"
              >
                {{ envoiEnCours === type.value ? 'Envoi...' : 'Téléverser' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  class="hidden"
                  :disabled="!!envoiEnCours"
                  @change="soumettre(type.value, $event)"
                />
              </label>
            </article>
          </div>
        </section>

        <!-- Note de bas de page -->
        <p class="flex items-start gap-2 text-xs leading-5 text-[#94A3B8]">
          <ShieldQuestion class="mt-0.5 h-4 w-4 shrink-0" />
          L'analyse automatique aide à la lecture du document, elle ne remplace jamais la décision
          d'un administrateur MIMOSY. Aucune pièce n'est authentifiée officiellement auprès d'un
          service d'État.
        </p>
      </template>
    </div>

    <!-- ================================================================
         MODALE SCANNER CAMÉRA
    ================================================================ -->
    <Teleport to="body">
      <div
        v-if="scannerOuvert"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Scanner de carte d'identité"
      >
        <div class="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#051F20]">
          <!-- Barre de titre -->
          <div class="flex items-center justify-between px-5 py-4">
            <p class="font-bold text-white">Scanner ma carte d'identité</p>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
              aria-label="Fermer le scanner"
              @click="fermerScanner"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Zone caméra ou aperçu de la capture -->
          <div class="relative aspect-[3/2] w-full overflow-hidden bg-black">
            <!-- Flux caméra en direct -->
            <video
              v-show="!photoUrl && !erreurCamera"
              ref="videoRef"
              autoplay
              playsinline
              muted
              class="h-full w-full object-cover"
            />

            <!-- Cadre de guidage (superposé sur la vidéo) -->
            <div
              v-if="!photoUrl && !erreurCamera"
              class="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div
                class="h-[55%] w-[85%] rounded-xl border-2 border-white/60"
                style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.45)"
              />
            </div>

            <!-- Aperçu après capture -->
            <img
              v-if="photoUrl"
              :src="photoUrl"
              alt="Photo capturée"
              class="h-full w-full object-contain"
            />

            <!-- Message d'erreur caméra -->
            <div
              v-if="erreurCamera"
              class="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center"
            >
              <Camera class="h-12 w-12 text-white/40" />
              <p class="text-sm text-white/70">{{ erreurCamera }}</p>
            </div>
          </div>

          <!-- Canvas caché pour la capture -->
          <canvas ref="canvasRef" class="hidden" />

          <!-- Boutons d'action -->
          <div class="flex gap-3 px-5 py-4">
            <template v-if="!photoUrl && !erreurCamera">
              <!-- Capturer -->
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#051F20] transition hover:bg-white/90"
                @click="capturer"
              >
                <Camera class="h-4 w-4" />
                Capturer
              </button>
            </template>

            <template v-else-if="photoUrl">
              <!-- Utiliser cette photo -->
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24573F]"
                :disabled="!!envoiEnCours"
                @click="utiliserPhoto"
              >
                {{ envoiEnCours === 'PIECE_IDENTITE' ? 'Envoi...' : 'Utiliser cette photo' }}
              </button>
              <!-- Reprendre -->
              <button
                type="button"
                class="flex items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                :disabled="!!envoiEnCours"
                @click="reprendreCapture"
              >
                <RefreshCw class="h-4 w-4" />
                Reprendre
              </button>
            </template>

            <template v-else-if="erreurCamera">
              <!-- Fallback : ajouter une photo -->
              <label
                class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24573F]"
                @click="fermerScanner"
              >
                <ImagePlus class="h-4 w-4" />
                Ajouter une photo
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  class="hidden"
                  @change="surSelectionFichier($event, 'PIECE_IDENTITE')"
                />
              </label>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>
