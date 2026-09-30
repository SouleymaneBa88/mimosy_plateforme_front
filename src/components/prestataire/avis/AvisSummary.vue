<!--
  AvisSummary : résumé des avis d'un prestataire.
  Affiche deux cartes : la note moyenne (sur 5) et le nombre d'avis reçus.
-->
<script setup>
// Props : la note moyenne (texte, ex. "4.5") et le nombre d'avis.
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
    <!-- Carte 1 : note moyenne. -->
    <div class="rounded-2xl border border-[#D9DDD8] bg-white p-6">
      <p class="text-sm text-[#69716C]">Note moyenne</p>
      <p class="mt-2 text-3xl font-extrabold text-[#1D2521]">{{ average }} / 5</p>
      <div class="mt-3 flex gap-1 text-[#C08B3E]" aria-label="Note moyenne sur cinq">
        <span v-for="star in 5" :key="star" aria-hidden="true">★</span>
      </div>
    </div>

    <!-- Carte 2 : nombre d'avis. -->
    <div class="rounded-2xl border border-[#D9DDD8] bg-white p-6">
      <p class="text-sm text-[#69716C]">Avis reçus</p>
      <p class="mt-2 text-3xl font-extrabold text-[#1D2521]">{{ count }}</p>
      <p class="mt-3 text-sm text-[#69716C]">Après vos prestations réalisées</p>
    </div>
  </section>
</template>
