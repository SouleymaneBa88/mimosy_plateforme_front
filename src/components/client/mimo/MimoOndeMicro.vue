<script setup>
/**
 * Onde du micro : chaque barre suit le spectre RÉEL de la voix (useMicroMimo →
 * utils/niveauMicro.js). Sans parole, les barres restent au repos : aucune
 * animation décorative. Respecte « réduire les animations » (pas de transition).
 */
defineProps({
  // Valeurs entre 0 et 1, une par barre.
  bandes: { type: Array, required: true },
  // Faux pendant la transcription : barres figées et atténuées.
  vivante: { type: Boolean, default: true },
})
</script>

<template>
  <div class="onde flex h-8 items-center gap-[3px]" aria-hidden="true" data-testid="mimo-onde">
    <span
      v-for="(valeur, index) in bandes"
      :key="index"
      class="barre w-[3px] rounded-full"
      :class="vivante ? 'bg-mimosy-primary' : 'bg-mimosy-secondary/40'"
      :style="{ height: `${Math.round(10 + Math.min(1, valeur) * 90)}%` }"
    ></span>
  </div>
</template>

<style scoped>
.barre {
  transition: height 80ms linear;
}
@media (prefers-reduced-motion: reduce) {
  .barre {
    transition: none;
  }
}
</style>
