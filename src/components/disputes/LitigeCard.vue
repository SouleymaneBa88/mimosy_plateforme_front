<script setup>
/**
 * Carte de litige, partagée entre l'espace client et l'espace
 * prestataire. Le détail de l'analyse IA (réservé à l'administration,
 * voir apps.disputes.services) n'est jamais demandé ni affiché ici :
 * seules les informations prévues pour les parties prenantes le sont.
 */
// Outils Vue.
import { computed, onMounted, onUnmounted, ref } from 'vue'

// Appels à l'API des litiges et messages temporaires (toasts).
import * as disputeService from '@/services/disputeService'
import { useToast } from '@/composables/useToast'

// Props : le litige à afficher et le rôle de l'utilisateur.
const props = defineProps({
  litige: { type: Object, required: true },
  role: { type: String, required: true }, // 'CLIENT' | 'PRESTATAIRE'
})
// Événement "maj" : demande au parent de recharger le litige.
const emit = defineEmits(['maj'])

// Fonctions pour afficher un toast de succès ou d'erreur.
const { succes, erreur } = useToast()

// Couleurs du badge selon le statut.
const classeStatut = {
  RESOLU: 'bg-[#EAF8F2] text-[#16805B]',
  REJETE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_COURS: 'bg-[#EDF4FF] text-[#3267B1]',
  EN_ATTENTE: 'bg-[#FFF7E6] text-[#9A723C]',
  REPRISE_DEMANDEE: 'bg-[#FFF7E6] text-[#9A723C]',
  REPRISE_EFFECTUEE: 'bg-[#EDF4FF] text-[#3267B1]',
  DELAI_EXPIRE: 'bg-[#FFF0EE] text-[#A85148]',
  REATTRIBUE: 'bg-[#EDF4FF] text-[#3267B1]',
}
// Libellés lisibles de chaque statut.
const libellesStatut = {
  EN_ATTENTE: 'En attente',
  EN_COURS: "En cours d'examen",
  REPRISE_DEMANDEE: 'Reprise demandée',
  REPRISE_EFFECTUEE: 'Reprise effectuée',
  DELAI_EXPIRE: 'Délai de reprise expiré',
  REATTRIBUE: 'Réattribué à un autre prestataire',
  RESOLU: 'Résolu',
  REJETE: 'Rejeté',
}

/* ───────────────────────── Montant bloqué ───────────────────────── */

// "Montant bloqué" reste vrai tant que le litige n'est pas dans un état
// terminal : même pendant une reprise ou après réattribution, l'argent
// n'a jamais été rendu disponible normalement au prestataire initial
// (voir apps.disputes.views._appliquer_decision, seul chemin qui le
// débloque). Ne jamais laisser croire que le prestataire a déjà touché
// l'argent tant que ce n'est pas explicitement le cas.
const statutsTerminaux = ['RESOLU', 'REJETE']
const montantEncoreBloque = computed(() => props.litige.fonds_geles && !statutsTerminaux.includes(props.litige.statut))

/* ───────────────────────── Compte à rebours (reprise) ───────────────────────── */

// L'heure actuelle, mise à jour chaque seconde pour le compte à rebours.
const maintenant = ref(Date.now())
let intervalId = null

// Au montage : on démarre le minuteur (1 fois par seconde).
onMounted(() => {
  intervalId = setInterval(() => {
    maintenant.value = Date.now()
  }, 1000)
})
// Au démontage : on l'arrête.
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

// Temps restant avant la date limite de reprise, ex. "5 h 07 min".
const delaiRestant = computed(() => {
  if (props.litige.statut !== 'REPRISE_DEMANDEE' || !props.litige.date_limite_reprise) return null
  const diffMs = new Date(props.litige.date_limite_reprise).getTime() - maintenant.value
  if (diffMs <= 0) return 'Délai écoulé'
  const heures = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${heures} h ${String(minutes).padStart(2, '0')} min`
})

/* ───────────────────────── Confirmation de reprise (prestataire) ───────────────────────── */

// Formulaire de confirmation de reprise : ouvert ? texte ? envoi en cours ?
const repriseOuverte = ref(false)
const descriptionReprise = ref('')
const confirmationEnCours = ref(false)

// Le prestataire confirme avoir refait le travail.
async function confirmerReprise() {
  confirmationEnCours.value = true
  try {
    await disputeService.confirmerReprise(props.litige.id, descriptionReprise.value.trim())
    succes('Reprise confirmée. MIMOSY va examiner le dossier.')
    repriseOuverte.value = false
    descriptionReprise.value = ''
    emit('maj')
  } catch (error) {
    erreur(error.message)
  } finally {
    confirmationEnCours.value = false
  }
}

// Ma description, celle de l'autre partie, et le nom de l'autre partie (selon mon rôle).
const monTexte = computed(() => props.role === 'CLIENT' ? props.litige.description_client : props.litige.description_prestataire)
const texteAutrePartie = computed(() => props.role === 'CLIENT' ? props.litige.description_prestataire : props.litige.description_client)
const nomAutrePartie = computed(() => props.role === 'CLIENT' ? props.litige.prestataire_nom : props.litige.client_nom)

// Les types de preuves possibles.
const typesPreuve = [
  { value: 'PHOTO_AVANT', label: 'Photo avant' },
  { value: 'PHOTO_APRES', label: 'Photo après' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'DEVIS', label: 'Devis' },
  { value: 'FACTURE', label: 'Facture' },
  { value: 'AUTRE', label: 'Autre' },
]

// Formulaire d'ajout de preuve : ouvert ? type ? description ? fichier ? envoi en cours ?
const ajoutOuvert = ref(false)
const typePreuve = ref('PHOTO_APRES')
const descriptionPreuve = ref('')
const fichier = ref(null)
const envoiEnCours = ref(false)

// Garde le fichier choisi.
function choisirFichier(event) {
  fichier.value = event.target.files?.[0] || null
}

// Envoie la preuve au serveur.
async function envoyerPreuve() {
  if (!fichier.value) {
    erreur('Choisissez un fichier à joindre.')
    return
  }

  envoiEnCours.value = true
  try {
    await disputeService.ajouterPreuve(props.litige.id, {
      fichier: fichier.value,
      typePreuve: typePreuve.value,
      description: descriptionPreuve.value.trim(),
    })
    succes('Preuve ajoutée.')
    ajoutOuvert.value = false
    descriptionPreuve.value = ''
    fichier.value = null
    emit('maj')
  } catch (error) {
    erreur(error.message)
  } finally {
    envoiEnCours.value = false
  }
}

/* ───────────────────────── Aperçu d'une preuve (lightbox) ───────────────────────── */

// Le fichier n'est jamais servi via une URL publique (voir
// PreuveLitigeFichierView) : chaque ouverture déclenche un fetch
// authentifié dédié (voir disputeService.recupererApercuPreuve).
const apercu = ref(null) // { url, contentType, preuve } | null
const apercuEnCours = ref(false)

// Ouvre l'aperçu d'une preuve (téléchargée de façon sécurisée).
async function ouvrirApercu(preuve) {
  apercuEnCours.value = true
  try {
    const { url, contentType } = await disputeService.recupererApercuPreuve(preuve.id)
    apercu.value = { url, contentType, preuve }
  } catch (error) {
    erreur(error.message)
  } finally {
    apercuEnCours.value = false
  }
}

// Ferme l'aperçu et libère la mémoire utilisée par le fichier.
function fermerApercu() {
  if (apercu.value) URL.revokeObjectURL(apercu.value.url)
  apercu.value = null
}

// Au démontage, on libère aussi la mémoire de l'aperçu s'il est ouvert.
onUnmounted(() => {
  if (apercu.value) URL.revokeObjectURL(apercu.value.url)
})
</script>

<template>
  <article class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 sm:p-6">
    <!-- En-tête : motif, autre partie, date et statut. -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-sans font-extrabold text-mimosy-text">{{ litige.motif }}</h2>
        <p class="mt-1 font-sans text-xs text-mimosy-secondary">
          Avec {{ nomAutrePartie }} · {{ new Date(litige.date_creation).toLocaleString('fr-FR') }}
        </p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-bold" :class="classeStatut[litige.statut]">
        {{ libellesStatut[litige.statut] || litige.statut }}
      </span>
    </div>

    <!-- Montant bloqué : jamais laisser croire que le prestataire a déjà reçu l'argent -->
    <p v-if="montantEncoreBloque" class="mt-3 rounded-xl bg-[#FFF7E6] px-4 py-3 text-sm font-semibold text-[#9A723C]">
      Paiement sécurisé — {{ Number(litige.montant_concerne).toLocaleString('fr-FR') }} FCFA restent bloqués pendant
      le traitement de ce litige.
    </p>

    <!-- Reprise demandée : compte à rebours + action pour le prestataire concerné -->
    <div v-if="litige.statut === 'REPRISE_DEMANDEE'" class="mt-3 rounded-xl border border-[#F5D9A8] bg-[#FFFBF0] p-4">
      <p class="text-sm font-bold text-[#9A723C]">MIMOSY demande de refaire cette prestation.</p>
      <p class="mt-1 text-xs text-[#9A723C]">Délai restant : {{ delaiRestant }}</p>

      <template v-if="role === 'PRESTATAIRE'">
        <button
          v-if="!repriseOuverte"
          type="button"
          class="mt-3 rounded-xl bg-mimosy-primary px-4 py-2 font-sans text-sm font-bold text-white transition hover:opacity-90"
          @click="repriseOuverte = true"
        >
          J'ai refait la prestation
        </button>
        <div v-else class="mt-3 flex flex-col gap-2">
          <textarea
            v-model="descriptionReprise"
            rows="3"
            placeholder="Décrivez ce qui a été refait (optionnel)"
            class="rounded-xl border border-mimosy-border px-3 py-2 font-sans text-sm text-mimosy-text"
          />
          <p class="font-sans text-xs text-mimosy-secondary">
            Ajoutez si besoin des photos après intervention via "Ajouter une preuve" ci-dessous, avant de confirmer.
          </p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-mimosy-border px-3 py-1.5 font-sans text-xs font-bold text-mimosy-text" @click="repriseOuverte = false">
              Annuler
            </button>
            <button
              type="button"
              class="rounded-lg bg-mimosy-primary px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              :disabled="confirmationEnCours"
              @click="confirmerReprise"
            >
              {{ confirmationEnCours ? 'Envoi...' : 'Confirmer la reprise' }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <p v-else-if="litige.statut === 'REPRISE_EFFECTUEE'" class="mt-3 rounded-xl bg-[#EDF4FF] px-4 py-3 text-sm font-semibold text-[#3267B1]">
      Le prestataire indique avoir refait la prestation. MIMOSY examine le dossier avant décision finale.
    </p>

    <p v-else-if="litige.statut === 'DELAI_EXPIRE'" class="mt-3 rounded-xl bg-[#FFF0EE] px-4 py-3 text-sm font-semibold text-[#A85148]">
      Le délai de reprise est écoulé. MIMOSY va statuer sur la suite (réattribution possible).
    </p>

    <p v-else-if="litige.statut === 'REATTRIBUE'" class="mt-3 rounded-xl bg-[#EDF4FF] px-4 py-3 text-sm font-semibold text-[#3267B1]">
      Cette prestation a été réattribuée{{ litige.nouveau_prestataire_nom ? ` à ${litige.nouveau_prestataire_nom}` : '' }}.
    </p>

    <!-- Les deux versions des faits. -->
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <p class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Ma version</p>
        <p class="font-sans text-sm text-mimosy-text">{{ monTexte || 'Aucune description fournie.' }}</p>
      </div>
      <div>
        <p class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Version de l'autre partie</p>
        <p class="font-sans text-sm text-mimosy-text">{{ texteAutrePartie || 'Pas encore de réponse.' }}</p>
      </div>
    </div>

    <!-- Liste des preuves (cliquer pour voir l'aperçu). -->
    <div v-if="litige.preuves?.length" class="mt-3">
      <p class="font-sans text-xs font-bold uppercase text-mimosy-secondary">Pièces jointes ({{ litige.preuves.length }})</p>
      <ul class="mt-1 flex flex-wrap gap-2">
        <li v-for="preuve in litige.preuves" :key="preuve.id">
          <button
            type="button"
            :disabled="apercuEnCours"
            class="rounded-full bg-mimosy-page px-3 py-1 font-sans text-xs font-semibold text-mimosy-text transition hover:bg-mimosy-border disabled:opacity-60"
            @click="ouvrirApercu(preuve)"
          >
            {{ typesPreuve.find((type) => type.value === preuve.type_preuve)?.label || preuve.type_preuve }} · {{ preuve.depose_par_nom }}
          </button>
        </li>
      </ul>
    </div>

    <!-- Aperçu d'une preuve : fetch authentifié, jamais une URL publique -->
    <Teleport to="body">
      <div
        v-if="apercu"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        @click.self="fermerApercu"
      >
        <div class="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
            <p class="text-sm font-bold text-[#051F20]">
              {{ typesPreuve.find((type) => type.value === apercu.preuve.type_preuve)?.label || apercu.preuve.type_preuve }}
              · {{ apercu.preuve.depose_par_nom }}
            </p>
            <button type="button" class="text-xl text-[#64748B]" aria-label="Fermer" @click="fermerApercu">×</button>
          </div>
          <div class="max-h-[75vh] overflow-auto bg-[#F8FAFC] p-4">
            <img
              v-if="apercu.contentType.startsWith('image/')"
              :src="apercu.url"
              alt="Aperçu de la preuve"
              class="mx-auto max-h-[70vh] w-auto rounded-xl object-contain"
            />
            <div v-else class="flex flex-col items-center gap-3 py-8 text-sm text-[#64748B]">
              <p>Ce fichier est un document (PDF), sans aperçu image.</p>
              <a :href="apercu.url" target="_blank" rel="noopener" class="rounded-xl bg-[#2F6250] px-4 py-2 font-bold text-white">
                Ouvrir le document
              </a>
            </div>
          </div>
          <p v-if="apercu.preuve.description" class="border-t border-[#F1F5F9] px-4 py-3 text-sm text-[#334155]">
            {{ apercu.preuve.description }}
          </p>
        </div>
      </div>
    </Teleport>

    <!-- Décision de l'administration, si elle existe. -->
    <p v-if="litige.decision_admin" class="mt-3 rounded-xl bg-mimosy-page p-3 font-sans text-sm text-mimosy-text">
      <strong>Décision MIMOSY :</strong> {{ litige.decision_admin }}
    </p>

    <!-- Ajout d'une preuve (tant que le litige n'est pas terminé). -->
    <div v-if="['EN_ATTENTE', 'EN_COURS', 'REPRISE_DEMANDEE'].includes(litige.statut)" class="mt-4">
      <button v-if="!ajoutOuvert" type="button" class="rounded-xl border border-mimosy-border px-4 py-2 font-sans text-sm font-bold text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary" @click="ajoutOuvert = true">
        Ajouter une preuve
      </button>

      <div v-else class="mt-2 flex flex-col gap-2 rounded-xl border border-mimosy-border p-3 text-mimosy-text">
        <select v-model="typePreuve" class="rounded-lg border border-mimosy-border px-3 py-2 font-sans text-sm">
          <option v-for="type in typesPreuve" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
        <input type="file" accept="image/jpeg,image/png,application/pdf" class="font-sans text-sm" @change="choisirFichier" />
        <input v-model="descriptionPreuve" type="text" placeholder="Description (optionnel)" class="rounded-lg border border-mimosy-border px-3 py-2 font-sans text-sm" />
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-mimosy-border px-3 py-1.5 font-sans text-xs font-bold text-mimosy-text" @click="ajoutOuvert = false">
            Annuler
          </button>
          <button type="button" class="rounded-lg bg-mimosy-primary px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50" :disabled="envoiEnCours" @click="envoyerPreuve">
            {{ envoiEnCours ? 'Envoi...' : 'Envoyer' }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
