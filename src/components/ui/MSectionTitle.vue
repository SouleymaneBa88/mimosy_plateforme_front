<script setup>
/**
 * Titre de section.
 * - variant="editorial" : numéro optionnel (« 01 »), titre en serif, filet —
 *   pour la landing et les écrans éditoriaux.
 * - variant="plain"     : titre DM Sans compact, pour les dashboards.
 * Slot `action` : lien « Tout voir » ou bouton aligné à droite.
 */
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  number: { type: String, default: '' },
  description: { type: String, default: '' },
  variant: { type: String, default: 'plain', validator: (v) => ['editorial', 'plain'].includes(v) },
  as: { type: String, default: 'h2' },
  id: { type: String, default: '' },
})
</script>

<template>
  <div class="m-section-title" :class="`m-section-title--${variant}`">
    <div class="m-section-title__text">
      <p v-if="eyebrow || number" class="m-section-title__eyebrow text-eyebrow">
        <span v-if="number" class="m-section-title__number tabular">{{ number }}</span>
        <span v-if="eyebrow">{{ eyebrow }}</span>
      </p>
      <component :is="as" :id="id || undefined" class="m-section-title__title">{{ title }}</component>
      <p v-if="description" class="m-section-title__description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="m-section-title__action"><slot name="action" /></div>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-section-title {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    font-family: var(--mimosy-font-sans);
  }

  .m-section-title__text {
    min-width: 0;
    max-width: 40rem;
  }

  .m-section-title__eyebrow {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    color: var(--mimosy-green);
  }

  .m-section-title__number {
    color: var(--mimosy-muted);
  }

  .m-section-title__title {
    color: var(--mimosy-green-dark);
  }

  .m-section-title--plain .m-section-title__title {
    font-size: 1.0625rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .m-section-title--editorial {
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--mimosy-border);
  }

  .m-section-title--editorial .m-section-title__eyebrow {
    margin-bottom: 0.9rem;
  }

  .m-section-title--editorial .m-section-title__title {
    font-family: var(--mimosy-font-serif);
    font-size: clamp(2rem, 1.4rem + 2.4vw, 3.25rem);
    font-weight: 400;
    line-height: 1.02;
    letter-spacing: -0.012em;
  }

  .m-section-title__description {
    margin-top: 0.6rem;
    color: var(--mimosy-text-soft);
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  .m-section-title--editorial .m-section-title__description {
    font-size: 1rem;
    margin-top: 0.9rem;
  }

  .m-section-title__action {
    flex-shrink: 0;
  }
}
</style>
