<script setup>
import { computed } from 'vue'

const props = defineProps({
  avis: {
    type: Object,
    required: true,
  },
})

const datePrestation = computed(() => props.avis.prestation?.date ? formatDate(props.avis.prestation.date) : '')
const dateAvis = computed(() => formatDate(props.avis.dateAvis || props.avis.date_creation))
const clientName = computed(() => props.avis.client?.nom || 'Client MIMOSY')

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}
</script>

<template>
  <article class="rounded-2xl border border-[#D9DDD8] bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-3">
        <img
          v-if="avis.client?.photo"
          :src="avis.client.photo"
          :alt="`Photo de ${clientName}`"
          class="h-11 w-11 rounded-full object-cover"
        />
        <div v-else class="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF3ED] font-bold text-[#2F6250]">
          {{ clientName.charAt(0) }}
        </div>
        <div>
          <h2 class="font-extrabold text-[#1D2521]">{{ clientName }}</h2>
          <p class="text-xs text-[#69716C]">Avis publié</p>
        </div>
      </div>

      <div class="flex items-center gap-2" :aria-label="`${avis.note} sur 5`">
        <span class="tracking-wide text-[#C08B3E]" aria-hidden="true">{{ '★'.repeat(avis.note) }}{{ '☆'.repeat(5 - avis.note) }}</span>
        <strong class="text-sm text-[#1D2521]">{{ avis.note }}/5</strong>
      </div>
    </div>

    <div class="mt-5 border-t border-[#F1F5F9] pt-4">
      <p class="font-bold text-[#2F6250]">{{ avis.prestation?.service || 'Prestation MIMOSY' }}</p>
      <p v-if="datePrestation" class="mt-1 text-sm text-[#69716C]">Prestation du {{ datePrestation }}</p>
      <p class="mt-4 text-[15px] leading-7 text-[#1D2521]">« {{ avis.commentaire }} »</p>
      <p class="mt-4 text-xs text-[#69716C]">Avis donné le {{ dateAvis }}</p>
    </div>
  </article>
</template>
