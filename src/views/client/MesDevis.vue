<script setup>
/**
 * Disposition reprise du langage visuel de front_mimosy (cartes premium,
 * filtres à compteurs dans l'esprit de MesDemandes.vue) — logique de
 * données inchangée : demandes + réponses de devis viennent de l'API
 * MIMOSY, acceptation d'une réponse réelle.
 */
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, FileText, MessageSquare } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import * as devisService from '@/services/devisService'

const demandes = ref([])
const reponses = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// Regroupe les réponses par demande (clé étrangère "reponse.demande"),
// pour pouvoir afficher chaque réponse sous la demande correspondante
// sans refaire un filtre à chaque rendu.
const reponsesParDemande = computed(() => {
  const grouped = new Map()
  reponses.value.forEach((reponse) => {
    if (!grouped.has(reponse.demande)) grouped.set(reponse.demande, [])
    grouped.get(reponse.demande).push(reponse)
  })
  return grouped
})

// Config d'affichage (libellé + couleur) par statut réel MIMOSY (le même
// enum sert à la demande de devis et à chaque réponse).
const configStatut = {
  EN_ATTENTE: { label: 'En attente', bg: 'var(--color-mimosy-blueBg)', color: 'var(--color-mimosy-blue)' },
  ACCEPTE: { label: 'Accepté', bg: 'var(--color-mimosy-primaryBg)', color: 'var(--color-mimosy-primary)' },
  REFUSE: { label: 'Refusé', bg: '#FFF0EE', color: '#C53B35' },
  EXPIRE: { label: 'Expiré', bg: 'var(--color-mimosy-grayBg)', color: 'var(--color-mimosy-gray)' },
}

function obtenirStatut(statut) {
  return configStatut[statut] || { label: statut, bg: 'var(--color-mimosy-grayBg)', color: 'var(--color-mimosy-gray)' }
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR')
}

// Charge en parallèle les demandes de devis et les réponses associées.
// Les deux endpoints peuvent renvoyer soit une liste brute, soit un objet
// paginé avec "results" selon la configuration du ViewSet côté Django.
async function chargerDevis() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [demandesData, reponsesData] = await Promise.all([
      devisService.listQuoteRequests(),
      devisService.listQuoteResponses(),
    ])
    demandes.value = Array.isArray(demandesData) ? demandesData : demandesData?.results || []
    reponses.value = Array.isArray(reponsesData) ? reponsesData : reponsesData?.results || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

// Accepte une réponse de devis, puis recharge tout (demandes + réponses)
// pour refléter le nouveau statut, plutôt que de mettre à jour l'état
// local à la main — plus sûr si l'acceptation modifie plusieurs statuts
// côté backend (ex. les autres réponses passent en "refusé" automatiquement).
async function accepterReponse(id) {
  errorMessage.value = ''
  try {
    await devisService.acceptQuoteResponse(id)
    await chargerDevis()
  } catch (error) {
    errorMessage.value = error.message
  }
}

onMounted(() => chargerDevis())

/* ---------------------------------------------------------------- *
 * Filtres, dans le même esprit visuel que MesDemandes.vue : onglets
 * pilules avec compteurs calculés à partir des vraies demandes.
 * ---------------------------------------------------------------- */
const filtreActif = ref('toutes')

function compterParStatut(statut) {
  if (statut === 'toutes') return demandes.value.length
  return demandes.value.filter((demande) => demande.statut === statut).length
}

const filtres = computed(() => [
  { id: 'toutes', label: 'Tous' },
  { id: 'EN_ATTENTE', label: 'En attente' },
  { id: 'ACCEPTE', label: 'Acceptés' },
  { id: 'REFUSE', label: 'Refusés' },
  { id: 'EXPIRE', label: 'Expirés' },
])

const demandesFiltrees = computed(() => {
  if (filtreActif.value === 'toutes') return demandes.value
  return demandes.value.filter((demande) => demande.statut === filtreActif.value)
})
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[100%] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Mes devis</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Retrouvez vos demandes de devis et les réponses reçues.</p>
      </div>

      <!-- Filtres -->
      <div class="-mx-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <button
          v-for="filtre in filtres"
          :key="filtre.id"
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-bold transition"
          :class="filtreActif === filtre.id ? 'bg-mimosy-text text-white' : 'border border-mimosy-border bg-mimosy-surface text-mimosy-text hover:border-mimosy-primary hover:text-mimosy-primary'"
          @click="filtreActif = filtre.id"
        >
          {{ filtre.label }}
          <span class="rounded-full px-1.5 py-0.5 text-[11px] leading-none" :class="filtreActif === filtre.id ? 'bg-white/15 text-white' : 'bg-mimosy-page text-mimosy-secondary'">
            {{ compterParStatut(filtre.id) }}
          </span>
        </button>
      </div>

      <!-- CHARGEMENT -->
      <p v-if="isLoading" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-8 text-center font-sans text-sm font-semibold text-mimosy-secondary">
        Chargement de vos devis...
      </p>

      <!-- ERREUR -->
      <p v-else-if="errorMessage" class="rounded-[24px] border border-[#FECACA] bg-[#FFF0EE] p-6 text-center font-sans text-sm font-semibold text-[#C53B35]">
        {{ errorMessage }}
      </p>

      <!-- AUCUNE DEMANDE -->
      <EmptyState v-else-if="!demandesFiltrees.length" title="Aucune demande de devis" message="Vos demandes de devis apparaîtront ici après envoi à un prestataire." />

      <!-- LISTE DES DEMANDES, en cartes premium -->
      <div v-else class="grid gap-5">
        <article v-for="demande in demandesFiltrees" :key="demande.id" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 sm:p-6 lg:p-8">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-mimosy-border pb-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary">
                <FileText class="h-5 w-5" />
              </span>
              <div>
                <h2 class="font-serif text-lg text-mimosy-text sm:text-xl">{{ demande.service_nom || 'Service non renseigné' }}</h2>
                <p class="mt-1 font-sans text-sm text-mimosy-secondary">Prestataire : {{ demande.prestataire_nom || 'Non renseigné' }}</p>
              </div>
            </div>

            <span class="rounded-full px-3 py-1 font-sans text-xs font-bold" :style="{ backgroundColor: obtenirStatut(demande.statut).bg, color: obtenirStatut(demande.statut).color }">
              {{ obtenirStatut(demande.statut).label }}
            </span>
          </div>

          <dl class="mt-5 grid gap-4 font-sans text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Budget estimé</dt>
              <dd class="mt-1 font-bold text-mimosy-primary">{{ Number(demande.budget_estime || 0).toLocaleString('fr-FR') }} FCFA</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Date souhaitée</dt>
              <dd class="mt-1 font-bold text-mimosy-text">{{ formatDate(demande.date_souhaitee) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Créée le</dt>
              <dd class="mt-1 font-bold text-mimosy-text">{{ formatDate(demande.date_creation) }}</dd>
            </div>
          </dl>

          <p v-if="demande.description" class="mt-5 font-sans text-sm leading-6 text-mimosy-secondary">{{ demande.description }}</p>

          <!-- RÉPONSES DE LA DEMANDE -->
          <div class="mt-6 border-t border-mimosy-border pt-6">
            <div class="flex items-center gap-2">
              <MessageSquare class="h-4 w-4 text-mimosy-primary" />
              <h3 class="font-sans font-bold text-mimosy-text">Réponses reçues</h3>
            </div>

            <div v-if="reponsesParDemande.get(demande.id)?.length" class="mt-3 grid gap-3">
              <div v-for="reponse in reponsesParDemande.get(demande.id)" :key="reponse.id" class="rounded-2xl border border-mimosy-border p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="font-sans text-lg font-extrabold text-mimosy-primary">{{ Number(reponse.prix_propose || 0).toLocaleString('fr-FR') }} FCFA</p>
                    <p class="mt-1 font-sans text-sm text-mimosy-secondary">Délai estimé : {{ reponse.delai_estime }} jour(s)</p>
                  </div>

                  <span class="rounded-full px-3 py-1 font-sans text-xs font-bold" :style="{ backgroundColor: obtenirStatut(reponse.statut).bg, color: obtenirStatut(reponse.statut).color }">
                    {{ obtenirStatut(reponse.statut).label }}
                  </span>
                </div>

                <p class="mt-3 font-sans text-sm leading-6 text-mimosy-secondary">{{ reponse.description || 'Aucune précision fournie.' }}</p>

                <button
                  v-if="demande.statut === 'EN_ATTENTE' && reponse.statut === 'EN_ATTENTE'"
                  type="button"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90"
                  @click="accepterReponse(reponse.id)"
                >
                  <CheckCircle2 class="h-4 w-4" />
                  Accepter ce devis
                </button>
              </div>
            </div>

            <p v-else class="mt-3 rounded-xl border border-dashed border-mimosy-border p-4 font-sans text-sm text-mimosy-secondary">
              Aucune réponse reçue pour le moment.
            </p>
          </div>
        </article>
      </div>
    </div>
  </ClientLayout>
</template>
