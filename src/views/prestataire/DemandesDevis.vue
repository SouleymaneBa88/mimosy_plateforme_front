<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import * as devisService from '@/services/devisService'

const authStore = useAuthStore()
const demandes = ref([])
const reponses = ref([])
const selectedId = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const form = reactive({ prix_propose: '', description: '', delai_estime: '' })

const userName = computed(() => [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ') || 'Prestataire')
const demandeSelectionnee = computed(() => demandes.value.find((demande) => demande.id === selectedId.value) || demandes.value[0] || null)
const reponseExistante = computed(() => reponses.value.find((reponse) => reponse.demande === demandeSelectionnee.value?.id) || null)

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR')
}

function resetForm() {
  form.prix_propose = ''
  form.description = ''
  form.delai_estime = ''
}

function selectDemande(id) {
  selectedId.value = id
  resetForm()
}

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
    selectedId.value = demandes.value[0]?.id || ''
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

async function envoyerReponse() {
  if (!demandeSelectionnee.value || !form.prix_propose || !form.delai_estime) {
    errorMessage.value = 'Veuillez renseigner le montant et le délai.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await devisService.createQuoteResponse({
      demande: demandeSelectionnee.value.id,
      prix_propose: form.prix_propose,
      description: form.description.trim(),
      delai_estime: form.delai_estime,
    })
    resetForm()
    await chargerDevis()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => chargerDevis())
</script>

<template>
  <AppLayout role="prestataire">
    <div class="mx-auto flex w-full  flex-col gap-7">
      <ClientHeader title="Demandes de devis" subtitle="Consultez les devis reçus et répondez avec une proposition enregistrée." :user-name="userName" profile-path="/prestataire/profil" />

      <p v-if="isLoading" class="rounded-2xl bg-white p-8 text-center text-[#64748B]">Chargement des demandes de devis...</p>
      <p v-else-if="errorMessage" class="rounded-2xl bg-[#FFF0EE] p-6 text-center text-[#A85148]">{{ errorMessage }}</p>

      <EmptyState
        v-else-if="!demandes.length"
        title="Aucune demande de devis reçue"
        message="Les demandes de devis adressées à vos services apparaîtront ici."
      />

      <section v-else class="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div class="flex flex-col gap-3">
          <button
            v-for="demande in demandes"
            :key="demande.id"
            type="button"
            class="w-full rounded-2xl border bg-white p-5 text-left transition"
            :class="demandeSelectionnee?.id === demande.id ? 'border-[#2F6250] ring-2 ring-[#2F6250]/10' : 'border-[#E2E8F0] hover:border-[#B7C8BF]'"
            @click="selectDemande(demande.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate font-bold text-[#051F20]">{{ demande.service_nom || 'Service non renseigné' }}</h2>
                <p class="mt-1 text-sm text-[#64748B]">Client : {{ demande.client_nom || 'Client' }}</p>
              </div>
              <span class="shrink-0 rounded-full bg-[#EDF4FF] px-3 py-1 text-xs font-bold text-[#3267B1]">{{ demande.statut }}</span>
            </div>
            <p class="mt-4 text-xs text-[#64748B]">{{ formatDate(demande.date_creation) }}</p>
          </button>
        </div>

        <article v-if="demandeSelectionnee" class="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-[#64748B]">Détail du devis</p>
              <h2 class="mt-2 text-2xl font-extrabold text-[#051F20]">{{ demandeSelectionnee.service_nom || 'Service non renseigné' }}</h2>
              <p class="mt-1 text-sm text-[#64748B]">Client : {{ demandeSelectionnee.client_nom || 'Client' }}</p>
            </div>
            <span class="rounded-full bg-[#EDF4FF] px-3 py-1 text-xs font-bold text-[#3267B1]">{{ demandeSelectionnee.statut }}</span>
          </div>

          <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-[#94A3B8]">Budget estimé</dt>
              <dd class="font-bold text-[#2F6250]">{{ Number(demandeSelectionnee.budget_estime || 0).toLocaleString('fr-FR') }} FCFA</dd>
            </div>
            <div>
              <dt class="text-[#94A3B8]">Date souhaitée</dt>
              <dd class="font-bold text-[#334155]">{{ formatDate(demandeSelectionnee.date_souhaitee) }}</dd>
            </div>
            <div>
              <dt class="text-[#94A3B8]">Créée le</dt>
              <dd class="font-bold text-[#334155]">{{ formatDate(demandeSelectionnee.date_creation) }}</dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-[#F1F5F9] pt-5">
            <p class="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Description</p>
            <p class="mt-2 text-sm leading-6 text-[#64748B]">{{ demandeSelectionnee.description }}</p>
          </div>

          <section class="mt-6 border-t border-[#F1F5F9] pt-5">
            <div v-if="reponseExistante" class="rounded-xl bg-[#EAF8F2] p-4">
              <p class="text-sm font-bold text-[#16805B]">Réponse envoyée</p>
              <p class="mt-2 text-xl font-extrabold text-[#2F6250]">{{ Number(reponseExistante.prix_propose || 0).toLocaleString('fr-FR') }} FCFA</p>
              <p class="mt-1 text-sm text-[#64748B]">Délai : {{ reponseExistante.delai_estime }} jour(s) · Statut : {{ reponseExistante.statut }}</p>
              <p class="mt-3 text-sm leading-6 text-[#64748B]">{{ reponseExistante.description || 'Aucune précision fournie.' }}</p>
            </div>

            <form v-else class="grid gap-4" @submit.prevent="envoyerReponse">
              <h3 class="font-bold text-[#051F20]">Répondre au devis</h3>
              <label class="grid gap-2 text-sm font-bold text-[#051F20]">Montant proposé (FCFA)<input v-model="form.prix_propose" type="number" min="0.01" step="0.01" required class="rounded-xl border border-[#E2E8F0] px-4 py-3 font-normal outline-none focus:border-[#2F6250]" /></label>
              <label class="grid gap-2 text-sm font-bold text-[#051F20]">Délai estimé (jours)<input v-model="form.delai_estime" type="number" min="1" step="1" required class="rounded-xl border border-[#E2E8F0] px-4 py-3 font-normal outline-none focus:border-[#2F6250]" /></label>
              <label class="grid gap-2 text-sm font-bold text-[#051F20]">Réponse<textarea v-model="form.description" rows="4" class="rounded-xl border border-[#E2E8F0] px-4 py-3 font-normal outline-none focus:border-[#2F6250]" placeholder="Décrivez ce qui est inclus dans votre proposition"></textarea></label>
              <button type="submit" :disabled="isSubmitting" class="rounded-xl bg-[#2F6250] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{{ isSubmitting ? 'Envoi...' : 'Envoyer la réponse' }}</button>
            </form>
          </section>
        </article>
      </section>
    </div>
  </AppLayout>
</template>
