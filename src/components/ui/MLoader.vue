<script setup>
/**
 * Indicateurs de chargement.
 * - spinner  : action ponctuelle, petit espace
 * - skeleton : contenu en cours d'arrivée (lignes grisées, pulsation lente)
 * - page     : chargement initial d'un écran entier
 */
defineProps({
  variant: { type: String, default: 'spinner', validator: (v) => ['spinner', 'skeleton', 'page'].includes(v) },
  label: { type: String, default: 'Chargement…' },
  lines: { type: Number, default: 3 },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
})
</script>

<template>
  <div v-if="variant === 'skeleton'" class="m-skeleton" role="status" aria-live="polite">
    <span class="sr-only">{{ label }}</span>
    <slot>
      <span
        v-for="n in lines"
        :key="n"
        class="m-skeleton__line"
        :style="{ width: n === lines && lines > 1 ? '58%' : `${100 - ((n * 7) % 22)}%` }"
        aria-hidden="true"
      />
    </slot>
  </div>

  <div v-else-if="variant === 'page'" class="m-loader-page" role="status" aria-live="polite">
    <span class="m-loader__spinner m-loader__spinner--lg m-spin" aria-hidden="true" />
    <p class="m-loader-page__label">{{ label }}</p>
  </div>

  <div v-else class="m-loader" role="status" aria-live="polite">
    <span class="m-loader__spinner m-spin" :class="`m-loader__spinner--${size}`" aria-hidden="true" />
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .m-loader__spinner {
    display: inline-block;
    border-radius: 999px;
    border: 2px solid var(--mimosy-border);
    border-top-color: var(--mimosy-green);
    animation: mimosy-spin 0.8s linear infinite;
  }

  .m-loader__spinner--sm { width: 1rem; height: 1rem; }
  .m-loader__spinner--md { width: 1.5rem; height: 1.5rem; }
  .m-loader__spinner--lg { width: 2rem; height: 2rem; }

  .m-loader-page {
    display: flex;
    min-height: 50vh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    animation: mimosy-fade-in 400ms var(--mimosy-ease) 150ms both;
  }

  .m-loader-page__label {
    color: var(--mimosy-text-soft);
    font-family: var(--mimosy-font-sans);
    font-size: 0.875rem;
  }

  .m-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .m-skeleton__line,
  .m-skeleton :deep(.m-skeleton-block) {
    display: block;
    height: 0.8rem;
    border-radius: 999px;
    background: var(--mimosy-sunken);
    animation: mimosy-skeleton 1.8s ease-in-out infinite;
  }
}
</style>
