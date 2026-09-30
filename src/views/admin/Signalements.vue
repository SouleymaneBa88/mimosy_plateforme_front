<!--
  Page admin "Signalements" : les signalements envoyés par les utilisateurs.
  L'admin peut les prendre en charge, les marquer comme traités ou les rejeter
  (avec une note obligatoire).
-->
<script setup>
// Outils Vue.
import { onMounted, ref } from 'vue'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Modal from '@/components/common/Modal.vue'
import Pagination from '@/components/common/Pagination.vue'
// Composable des listes admin, toasts, et appels à l'API admin.
import { useAdminListe } from '@/composables/useAdminListe'
import { useToast } from '@/composables/useToast'
import * as adminService from '@/services/adminService'

// Liste paginée des signalements, avec filtres statut et type.
const { items: signalements, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage } =
  useAdminListe(adminService.listSignalements, { statut: '', type_cible: '' })
// Fonctions pour afficher un toast.
const { succes, erreur } = useToast()

// Les options des filtres.
const statuts = ['', 'EN_ATTENTE', 'EN_COURS', 'TRAITE', 'REJETE']
const types = ['', 'AVIS', 'COMPORTEMENT', 'AUTRE']

// Couleurs du badge selon le statut.
const classeStatut = {
  TRAITE: 'bg-[#EAF8F2] text-[#16805B]',
  REJETE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_COURS: 'bg-[#EDF4FF] text-[#3267B1]',
  EN_ATTENTE: 'bg-[#FFF7E6] text-[#9A723C]',
}

// Le signalement en cours de traitement, la décision en cours, et la note de l'admin.
const actionEnCours = ref('')
const decision = ref(null) // { signalement, type: 'traiter' | 'rejeter' }
const note = ref('')

// Prendre en charge un signalement, puis recharger la liste.
async function prendreEnCharge(signalement) {
  actionEnCours.value = signalement.id
  try {
    await adminService.prendreEnChargeSignalement(signalement.id)
    succes('Signalement pris en charge.')
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    actionEnCours.value = ''
  }
}

// Ouvre la fenêtre de décision (traiter ou rejeter).
function ouvrirDecision(signalement, type) {
  decision.value = { signalement, type }
  note.value = ''
}

// Confirme la décision avec la note écrite par l'admin.
async function confirmerDecision() {
  // La note doit faire au moins 5 caractères.
  if (!decision.value || note.value.trim().length < 5) {
    erreur('Merci de préciser une note d\'au moins 5 caractères.')
    return
  }

  const { signalement, type } = decision.value
  actionEnCours.value = signalement.id
  try {
    if (type === 'traiter') {
      await adminService.traiterSignalement(signalement.id, note.value.trim())
      succes('Signalement marqué comme traité.')
    } else {
      await adminService.rejeterSignalement(signalement.id, note.value.trim())
      succes('Signalement rejeté.')
    }
    decision.value = null
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    actionEnCours.value = ''
  }
}

// On charge la liste au montage.
onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Signalements" subtitle="Signalements envoyés par les utilisateurs, à traiter par l'administration." />

      <!-- Filtres : statut et type. -->
      <div class="flex flex-wrap items-center gap-2 text-black">
        <select v-model="filtres.statut" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="rechercher">
          <option v-for="statut in statuts" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
        </select>
        <select v-model="filtres.type_cible" class="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" @change="rechercher">
          <option v-for="type in types" :key="type" :value="type">{{ type || 'Tous les types' }}</option>
        </select>
      </div>

      <!-- États : chargement, erreur, vide. -->
      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />
      <EmptyState v-else-if="!signalements.length" title="Aucun signalement" message="Aucun signalement ne correspond à ces critères." />

      <!-- Une carte par signalement. -->
      <div v-else class="grid gap-4">
        <article v-for="signalement in signalements" :key="signalement.id" class="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-extrabold text-[#051F20]">{{ signalement.motif }}</h2>
              <p class="mt-1 text-xs text-[#94A3B8]">
                Par {{ signalement.createur_nom }} ({{ signalement.createur_email }}) ·
                {{ new Date(signalement.date_creation).toLocaleString('fr-FR') }}
              </p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="classeStatut[signalement.statut]">{{ signalement.statut }}</span>
          </div>

          <p class="mt-3 text-sm text-[#334155]">{{ signalement.description }}</p>
          <p class="mt-2 text-xs font-bold uppercase text-[#94A3B8]">Type : {{ signalement.type_cible }}</p>

          <p v-if="signalement.note_resolution" class="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#334155]">
            <strong>Décision :</strong> {{ signalement.note_resolution }}
          </p>

          <!-- Boutons d'action, tant que le signalement n'est pas terminé. -->
          <div v-if="signalement.statut === 'EN_ATTENTE' || signalement.statut === 'EN_COURS'" class="mt-4 flex flex-wrap gap-2">
            <button
              v-if="signalement.statut === 'EN_ATTENTE'"
              type="button"
              class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20] disabled:opacity-50"
              :disabled="actionEnCours === signalement.id"
              @click="prendreEnCharge(signalement)"
            >
              Prendre en charge
            </button>
            <button
              type="button"
              class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="actionEnCours === signalement.id"
              @click="ouvrirDecision(signalement, 'traiter')"
            >
              Marquer comme traité
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#E7B8B2] px-4 py-2 text-sm font-bold text-[#A85148] disabled:opacity-50"
              :disabled="actionEnCours === signalement.id"
              @click="ouvrirDecision(signalement, 'rejeter')"
            >
              Rejeter
            </button>
          </div>
        </article>

        <Pagination :page="page" :count="count" :page-size="pageSize" @update:page="changerPage" />
      </div>
    </div>

    <!-- Fenêtre de décision : l'admin écrit une note puis confirme. -->
    <Modal
      :model-value="!!decision"
      :title="decision?.type === 'traiter' ? 'Traiter le signalement' : 'Rejeter le signalement'"
      @update:model-value="decision = null"
    >
      <p class="text-sm text-[#334155]">Cette décision est définitive et sera visible par l'auteur du signalement.</p>
      <textarea
        v-model="note"
        rows="3"
        placeholder="Expliquez la décision prise (obligatoire)..."
        class="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
      />
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="decision = null">
          Annuler
        </button>
        <button type="button" class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white" @click="confirmerDecision">
          Confirmer
        </button>
      </div>
    </Modal>
  </AppLayout>
</template>
