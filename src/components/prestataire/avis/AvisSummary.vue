<script setup>
defineProps({
  average: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-[#D9DDD8] bg-white p-6">
      <p class="text-sm text-[#69716C]">Note moyenne</p>
      <p class="mt-2 text-3xl font-extrabold text-[#1D2521]">{{ average }} / 5</p>
      <div class="mt-3 flex gap-1 text-[#C08B3E]" aria-label="Note moyenne sur cinq">
        <span v-for="star in 5" :key="star" aria-hidden="true">★</span>
      </div>
    </div>

    <div class="rounded-2xl border border-[#D9DDD8] bg-white p-6">
      <p class="text-sm text-[#69716C]">Avis reçus</p>
      <p class="mt-2 text-3xl font-extrabold text-[#1D2521]">{{ count }}</p>
      <p class="mt-3 text-sm text-[#69716C]">Après vos prestations réalisées</p>
    </div>
  </section>
</template>
