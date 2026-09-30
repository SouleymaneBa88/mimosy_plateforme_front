<script setup>
/** File de modération des avis flagués par l'analyse IA (sentiment/toxicité). */
// Outils Vue, composants et appels à l'API admin.
import { onMounted, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import * as adminService from '@/services/adminService'

// La liste des avis, les états de chargement et d'erreur, et l'avis en cours de traitement.
const avis = ref([])
const loading = ref(false)
const errorMessage = ref('')
const actionEnCours = ref('')

// Charge les avis en attente de modération.
async function charger() {
  loading.value = true
  errorMessage.value = ''
  try {
    avis.value = await adminService.listAvisEnAttente()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// Approuve un avis puis le retire de la liste.
async function approuver(item) {
  actionEnCours.value = item.id
  try {
    await adminService.approuverAvis(item.id)
    avis.value = avis.value.filter((entry) => entry.id !== item.id)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    actionEnCours.value = ''
  }
}

// Bloque un avis puis le retire de la liste.
async function bloquer(item) {
  actionEnCours.value = item.id
  try {
    await adminService.bloquerAvis(item.id)
    avis.value = avis.value.filter((entry) => entry.id !== item.id)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    actionEnCours.value = ''
  }
}

// On charge dès que la page s'affiche.
onMounted(charger)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Modération des avis" subtitle="Avis mis en attente par l'analyse automatique." />

      <!-- États : chargement, erreur, vide. -->
      <p v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#64748B]">Chargement...</p>
      <p v-else-if="errorMessage" class="rounded-lg bg-[#FFF0EE] p-4 text-center text-sm text-[#A85148]">{{ errorMessage }}</p>

      <EmptyState v-else-if="!avis.length" title="Aucun avis en attente" message="Les avis signalés par l'analyse automatique apparaîtront ici." />

      <!-- Une carte par avis : note, analyse IA, commentaire et boutons. -->
      <div v-else class="grid gap-4">
        <article v-for="item in avis" :key="item.id" class="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-bold text-[#334155]">{{ item.note }}/5</span>
            <div class="flex gap-2 text-xs">
              <span v-if="item.sentiment" class="rounded-full bg-[#F1F5F9] px-2.5 py-1 font-bold text-[#64748B]">
                Sentiment : {{ item.sentiment }} ({{ item.score_sentiment != null ? Math.round(item.score_sentiment * 100) + '%' : '—' }})
              </span>
              <span v-if="item.est_inapproprie" class="rounded-full bg-[#FFF0EE] px-2.5 py-1 font-bold text-[#A85148]">
                Toxicité détectée ({{ item.score_toxicite != null ? Math.round(item.score_toxicite * 100) + '%' : '—' }})
              </span>
            </div>
          </div>

          <p class="mt-3 text-sm leading-6 text-[#334155]">{{ item.commentaire || 'Aucun commentaire.' }}</p>

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="rounded-xl bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              :disabled="actionEnCours === item.id"
              @click="approuver(item)"
            >
              Approuver
            </button>
            <button
              type="button"
              class="rounded-xl border border-[#E7B8B2] px-4 py-2.5 text-sm font-bold text-[#A85148] disabled:opacity-50"
              :disabled="actionEnCours === item.id"
              @click="bloquer(item)"
            >
              Bloquer
            </button>
          </div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>
