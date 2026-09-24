<script setup>
/**
 * Gestion des litiges entre clients et prestataires.
 *
 * La synthèse affichée (bouton "Analyser") n'est pas une IA : c'est un
 * simple comptage de faits déjà en base (voir apps.disputes.services,
 * qui documente explicitement cette limite). Elle n'est jamais
 * présentée comme un verdict, seulement comme une aide de lecture.
 */
import { computed, onMounted, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import Modal from '@/components/common/Modal.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useAdminListe } from '@/composables/useAdminListe'
import { useToast } from '@/composables/useToast'
import * as adminService from '@/services/adminService'

const { items: litiges, count, page, pageSize, loading, errorMessage, filtres, charger, rechercher, changerPage } =
  useAdminListe(adminService.listLitiges, { statut: '' })
const { succes, erreur } = useToast()

const statuts = [
  '',
  'EN_ATTENTE',
  'EN_COURS',
  'REPRISE_DEMANDEE',
  'REPRISE_EFFECTUEE',
  'DELAI_EXPIRE',
  'REATTRIBUE',
  'RESOLU',
  'REJETE',
]
const libellesStatut = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  REPRISE_DEMANDEE: 'Reprise demandée',
  REPRISE_EFFECTUEE: 'Reprise effectuée',
  DELAI_EXPIRE: 'Délai expiré',
  REATTRIBUE: 'Réattribué',
  RESOLU: 'Résolu',
  REJETE: 'Rejeté',
}
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
// Décisions qui acceptent encore une nouvelle action administrative
// (jamais une deuxième machine à états côté frontend : reprend
// exactement les statuts non terminaux exposés par le backend).
const STATUTS_ACTIONNABLES = ['EN_ATTENTE', 'EN_COURS']

const actionEnCours = ref('')
const decision = ref(null) // { litige, type: 'resoudre' | 'rejeter' | 'reprise' }
const texteDecision = ref('')
const analyses = ref({}) // litigeId -> résultat d'analyse
const analyseEnCours = ref('')

async function prendreEnCharge(litige) {
  actionEnCours.value = litige.id
  try {
    await adminService.prendreEnChargeLitige(litige.id)
    succes('Litige pris en charge.')
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    actionEnCours.value = ''
  }
}

async function analyser(litige) {
  analyseEnCours.value = litige.id
  try {
    analyses.value = { ...analyses.value, [litige.id]: await adminService.getAnalyseLitige(litige.id) }
  } catch (error) {
    erreur(error.message)
  } finally {
    analyseEnCours.value = ''
  }
}

function ouvrirDecision(litige, type) {
  decision.value = { litige, type }
  texteDecision.value = ''
}

const libellesDecision = {
  resoudre: 'Résoudre le litige',
  rejeter: 'Rejeter le litige',
  reprise: 'Demander une reprise sous 24h',
}

async function confirmerDecision() {
  if (!decision.value || texteDecision.value.trim().length < 10) {
    erreur('Merci de motiver la décision (10 caractères minimum).')
    return
  }

  const { litige, type } = decision.value
  actionEnCours.value = litige.id
  try {
    if (type === 'resoudre') {
      await adminService.resoudreLitige(litige.id, texteDecision.value.trim())
      succes('Litige marqué comme résolu. Les fonds gelés ont été débloqués vers le prestataire.')
    } else if (type === 'reprise') {
      await adminService.demanderRepriseLitige(litige.id, texteDecision.value.trim())
      succes('Reprise demandée au prestataire, avec un délai de 24 heures.')
    } else {
      await adminService.rejeterLitige(litige.id, texteDecision.value.trim())
      succes('Litige rejeté. Les fonds gelés ont été débloqués vers le prestataire.')
    }
    decision.value = null
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    actionEnCours.value = ''
  }
}

/* ───────────────────────── Réattribution ───────────────────────── */

const reattribution = ref(null) // litige en cours de réattribution
const prestatairesDisponibles = ref([])
const prestatairesChargement = ref(false)
const nouveauPrestataireId = ref('')

const prestatairesEligibles = computed(() =>
  prestatairesDisponibles.value.filter((prestataire) => prestataire.id !== reattribution.value?.prestataire),
)

async function ouvrirReattribution(litige) {
  reattribution.value = litige
  nouveauPrestataireId.value = ''
  prestatairesChargement.value = true
  try {
    const data = await adminService.listPrestatairesAdmin({ statut_verification: 'VERIFIE', page_size: 100 })
    prestatairesDisponibles.value = Array.isArray(data) ? data : data?.results || []
  } catch (error) {
    erreur(error.message)
  } finally {
    prestatairesChargement.value = false
  }
}

async function confirmerReattribution() {
  if (!reattribution.value || !nouveauPrestataireId.value) {
    erreur('Choisissez un prestataire pour reprendre la prestation.')
    return
  }

  actionEnCours.value = reattribution.value.id
  try {
    await adminService.reattribuerLitige(reattribution.value.id, nouveauPrestataireId.value)
    succes('Prestation réattribuée : 75 % au nouveau prestataire, 25 % conservés par le prestataire initial.')
    reattribution.value = null
    await charger()
  } catch (error) {
    erreur(error.message)
  } finally {
    actionEnCours.value = ''
  }
}

onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full flex-col gap-6">
      <ClientHeader title="Litiges" subtitle="Désaccords ouverts entre clients et prestataires." />

      <select v-model="filtres.statut" class="w-fit rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black" @change="rechercher">
        <option v-for="statut in statuts" :key="statut" :value="statut">{{ statut || 'Tous les statuts' }}</option>
      </select>

      <Loader v-if="loading" />
      <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="charger" />
      <EmptyState v-else-if="!litiges.length" title="Aucun litige" message="Aucun litige ne correspond à ces critères." />

      <div v-else class="grid gap-4">
        <article v-for="litige in litiges" :key="litige.id" class="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-extrabold text-[#051F20]">{{ litige.motif }}</h2>
              <p class="mt-1 text-xs text-[#94A3B8]">
                {{ litige.client_nom }} ↔ {{ litige.prestataire_nom }} ·
                {{ new Date(litige.date_creation).toLocaleString('fr-FR') }}
              </p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="classeStatut[litige.statut]">{{ libellesStatut[litige.statut] || litige.statut }}</span>
          </div>

          <!-- Montant / statut paiement : jamais mélangés, jamais devinés (voir apps.disputes.serializers.LitigeSerializer) -->
          <div class="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#F8FAFC] p-3 text-xs">
            <span class="font-bold text-[#051F20]">
              Montant concerné : {{ litige.montant_concerne != null ? `${Number(litige.montant_concerne).toLocaleString('fr-FR')} FCFA` : '—' }}
            </span>
            <span v-if="litige.fonds_geles" class="rounded-full bg-[#FFF0EE] px-2.5 py-1 font-bold text-[#A85148]">
              Fonds gelés
            </span>
            <span v-if="litige.paiement_statut" class="text-[#64748B]">Paiement : {{ litige.paiement_statut }}</span>
            <span v-if="litige.date_limite_reprise && litige.statut === 'REPRISE_DEMANDEE'" class="text-[#9A723C]">
              Délai jusqu'au {{ new Date(litige.date_limite_reprise).toLocaleString('fr-FR') }}
            </span>
            <span v-if="litige.nouveau_prestataire_nom" class="text-[#3267B1]">
              Réattribué à {{ litige.nouveau_prestataire_nom }}
            </span>
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs font-bold uppercase text-[#94A3B8]">Version du client</p>
              <p class="text-sm text-[#334155]">{{ litige.description_client || 'Aucune description fournie.' }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase text-[#94A3B8]">Version du prestataire</p>
              <p class="text-sm text-[#334155]">{{ litige.description_prestataire || 'Aucune description fournie.' }}</p>
            </div>
          </div>

          <p class="mt-3 text-xs text-[#94A3B8]">{{ litige.preuves.length }} pièce(s) jointe(s).</p>

          <p v-if="litige.decision_admin" class="mt-3 whitespace-pre-line rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#334155]">
            <strong>Décision :</strong> {{ litige.decision_admin }}
          </p>

          <div v-if="analyses[litige.id]" class="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
            <p class="font-bold text-[#051F20]">Synthèse (aide de lecture, pas un verdict)</p>
            <ul class="mt-1 list-disc pl-4 text-[#334155]">
              <li v-for="(constat, index) in analyses[litige.id].findings" :key="'f' + index">{{ constat }}</li>
            </ul>
            <ul v-if="analyses[litige.id].warnings.length" class="mt-1 list-disc pl-4 text-[#9A723C]">
              <li v-for="(avertissement, index) in analyses[litige.id].warnings" :key="'w' + index">{{ avertissement }}</li>
            </ul>
          </div>

          <div v-if="STATUTS_ACTIONNABLES.includes(litige.statut)" class="mt-4 flex flex-wrap gap-2">
            <button
              v-if="litige.statut === 'EN_ATTENTE'"
              type="button"
              class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20] disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="prendreEnCharge(litige)"
            >
              Prendre en charge
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20] disabled:opacity-50"
              :disabled="analyseEnCours === litige.id"
              @click="analyser(litige)"
            >
              Analyser
            </button>
            <button
              type="button"
              class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="ouvrirDecision(litige, 'resoudre')"
            >
              Marquer comme résolu
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#BFD7EE] px-4 py-2 text-sm font-bold text-[#3267B1] disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="ouvrirDecision(litige, 'reprise')"
            >
              Demander une reprise (24h)
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#E7B8B2] px-4 py-2 text-sm font-bold text-[#A85148] disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="ouvrirDecision(litige, 'rejeter')"
            >
              Rejeter
            </button>
          </div>

          <!-- Reprise en cours : rien à faire côté admin, juste informer -->
          <p v-else-if="litige.statut === 'REPRISE_DEMANDEE'" class="mt-4 text-sm text-[#9A723C]">
            En attente de la confirmation du prestataire avant l'expiration du délai.
          </p>
          <p v-else-if="litige.statut === 'REPRISE_EFFECTUEE'" class="mt-4 text-sm text-[#3267B1]">
            Le prestataire indique avoir refait la prestation.
            <button
              type="button"
              class="ml-2 rounded-xl bg-[#2F6250] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="ouvrirDecision(litige, 'resoudre')"
            >
              Clôturer (résoudre)
            </button>
          </p>

          <div v-else-if="litige.statut === 'DELAI_EXPIRE'" class="mt-4">
            <p class="text-sm text-[#A85148]">Le prestataire n'a pas confirmé la reprise dans le délai.</p>
            <button
              type="button"
              class="mt-2 rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="actionEnCours === litige.id"
              @click="ouvrirReattribution(litige)"
            >
              Réattribuer à un autre prestataire
            </button>
          </div>
        </article>

        <Pagination :page="page" :count="count" :page-size="pageSize" @update:page="changerPage" />
      </div>
    </div>

    <Modal
      :model-value="!!decision"
      :title="libellesDecision[decision?.type] || 'Décision'"
      @update:model-value="decision = null"
    >
      <p class="text-sm text-[#334155]">
        {{
          decision?.type === 'reprise'
            ? 'Le prestataire recevra 24 heures pour refaire la prestation. Les fonds restent gelés pendant ce délai.'
            : decision?.type === 'resoudre'
              ? 'Cette décision est définitive : les fonds gelés seront débloqués vers le prestataire.'
              : 'Cette décision est définitive et sera communiquée aux deux parties.'
        }}
      </p>
      <textarea
        v-model="texteDecision"
        rows="4"
        placeholder="Expliquez la décision prise (obligatoire)..."
        class="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black"
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

    <Modal :model-value="!!reattribution" title="Réattribuer la prestation" @update:model-value="reattribution = null">
      <p class="text-sm text-[#334155]">
        75 % du montant gelé ({{ Number(reattribution?.montant_concerne || 0).toLocaleString('fr-FR') }} FCFA) iront
        au nouveau prestataire, 25 % resteront acquis au prestataire initial.
      </p>

      <p v-if="prestatairesChargement" class="mt-3 text-sm text-[#64748B]">Chargement des prestataires vérifiés...</p>
      <select
        v-else
        v-model="nouveauPrestataireId"
        class="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black"
      >
        <option value="" disabled>Choisir un prestataire vérifié</option>
        <option v-for="prestataire in prestatairesEligibles" :key="prestataire.id" :value="prestataire.id">
          {{ prestataire.nom_complet }} ({{ prestataire.ville || 'ville non renseignée' }})
        </option>
      </select>
      <p v-if="!prestatairesChargement && !prestatairesEligibles.length" class="mt-2 text-sm text-[#A85148]">
        Aucun autre prestataire vérifié disponible dans MIMOSY.
      </p>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#051F20]" @click="reattribution = null">
          Annuler
        </button>
        <button
          type="button"
          class="rounded-xl bg-[#2F6250] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          :disabled="!nouveauPrestataireId"
          @click="confirmerReattribution"
        >
          Confirmer la réattribution
        </button>
      </div>
    </Modal>
  </AppLayout>
</template>
