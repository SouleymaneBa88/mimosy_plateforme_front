<script setup>
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, FileText, MessageSquare } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
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

// Config d'affichage (libellé + couleur) par statut, sur le même principe
// que configTypeNotification. EN_ATTENTE est le seul statut dont on est
// certain qu'il est utilisé par la logique (cf. accepterReponse plus bas) ;
// complète cette liste si le backend renvoie d'autres valeurs.
const configStatut = {
  EN_ATTENTE: { label: 'En attente', bg: '#EDF4FF', color: '#3267B1' },
  ACCEPTE: { label: 'Accepté', bg: '#ECFDF3', color: '#2F6250' },
  REFUSE: { label: 'Refusé', bg: '#FFF0EE', color: '#C53B35' },
  EXPIRE: { label: 'Expiré', bg: '#F1F5F9', color: '#64748B' },
}

function obtenirStatut(statut) {
  return configStatut[statut] || { label: statut, bg: '#F1F5F9', color: '#64748B' }
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
</script>

<template>
  <AppLayout>
    <div class="mx-auto flex w-full flex-col gap-7 sm:gap-8">
      <ClientHeader title="Mes devis" subtitle="Retrouvez vos demandes de devis et les réponses reçues." />

      <!-- CHARGEMENT -->
      <p
        v-if="isLoading"
        class="rounded-[8px] border border-[#E2E8F0] bg-white p-8 text-center text-sm font-semibold text-[#64748B] shadow-sm"
      >
        Chargement de vos devis...
      </p>

      <!-- ERREUR -->
      <p
        v-else-if="errorMessage"
        class="rounded-[8px] border border-[#FECACA] bg-[#FFF0EE] p-6 text-center text-sm font-semibold text-[#C53B35]"
      >
        {{ errorMessage }}
      </p>

      <!-- AUCUNE DEMANDE -->
      <EmptyState
        v-else-if="!demandes.length"
        title="Aucune demande de devis"
        message="Vos demandes de devis apparaîtront ici après envoi à un prestataire."
      />

      <!-- LISTE DES DEMANDES -->
      <div v-else class="grid gap-5">
        <article
          v-for="demande in demandes"
          :key="demande.id"
          class="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#F1F5F9] pb-5">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF3ED] text-[#2F6250]">
                <FileText class="h-5 w-5" />
              </span>

              <div>
                <h2 class="text-lg font-extrabold text-[#051F20] sm:text-xl">
                  {{ demande.service_nom || 'Service non renseigné' }}
                </h2>
                <p class="mt-1 text-sm text-[#64748B]">
                  Prestataire : {{ demande.prestataire_nom || 'Non renseigné' }}
                </p>
              </div>
            </div>

            <span
              class="rounded-full px-3 py-1 text-xs font-bold"
              :style="{
                backgroundColor: obtenirStatut(demande.statut).bg,
                color: obtenirStatut(demande.statut).color,
              }"
            >
              {{ obtenirStatut(demande.statut).label }}
            </span>
          </div>

          <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">Budget estimé</dt>
              <dd class="mt-1 font-bold text-[#2F6250]">
                {{ Number(demande.budget_estime || 0).toLocaleString('fr-FR') }} FCFA
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">Date souhaitée</dt>
              <dd class="mt-1 font-bold text-[#334155]">{{ formatDate(demande.date_souhaitee) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">Créée le</dt>
              <dd class="mt-1 font-bold text-[#334155]">{{ formatDate(demande.date_creation) }}</dd>
            </div>
          </dl>

          <p v-if="demande.description" class="mt-5 text-sm leading-6 text-[#64748B]">
            {{ demande.description }}
          </p>

          <!-- RÉPONSES DE LA DEMANDE -->
          <div class="mt-6 border-t border-[#F1F5F9] pt-6">
            <div class="flex items-center gap-2">
              <MessageSquare class="h-4 w-4 text-[#2F6250]" />
              <h3 class="font-bold text-[#051F20]">Réponses reçues</h3>
            </div>

            <div v-if="reponsesParDemande.get(demande.id)?.length" class="mt-3 grid gap-3">
              <div
                v-for="reponse in reponsesParDemande.get(demande.id)"
                :key="reponse.id"
                class="rounded-[10px] border border-[#E2E8F0] p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-lg font-extrabold text-[#2F6250]">
                      {{ Number(reponse.prix_propose || 0).toLocaleString('fr-FR') }} FCFA
                    </p>
                    <p class="mt-1 text-sm text-[#64748B]">
                      Délai estimé : {{ reponse.delai_estime }} jour(s)
                    </p>
                  </div>

                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold"
                    :style="{
                      backgroundColor: obtenirStatut(reponse.statut).bg,
                      color: obtenirStatut(reponse.statut).color,
                    }"
                  >
                    {{ obtenirStatut(reponse.statut).label }}
                  </span>
                </div>

                <p class="mt-3 text-sm leading-6 text-[#64748B]">
                  {{ reponse.description || 'Aucune précision fournie.' }}
                </p>

                <button
                  v-if="demande.statut === 'EN_ATTENTE' && reponse.statut === 'EN_ATTENTE'"
                  type="button"
                  class="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#244B3D]"
                  @click="accepterReponse(reponse.id)"
                >
                  <CheckCircle2 class="h-4 w-4" />
                  Accepter ce devis
                </button>
              </div>
            </div>

            <p v-else class="mt-3 rounded-[10px] border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">
              Aucune réponse reçue pour le moment.
            </p>
          </div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>