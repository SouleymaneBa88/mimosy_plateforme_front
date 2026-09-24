<script setup>
/**
 * Carte sobre : surface + bordure fine, sans ombre.
 * - default     : bloc de contenu
 * - compact     : padding réduit (listes denses)
 * - interactive : carte cliquable (lien ou bouton) avec survol par la
 *                 bordure, rendue en <RouterLink> si `to` est fourni.
 * Slots optionnels : header, footer.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'compact', 'interactive'].includes(v),
  },
  as: { type: String, default: 'div' },
  to: { type: [String, Object], default: null },
  tone: { type: String, default: 'surface', validator: (v) => ['surface', 'raised', 'sunken'].includes(v) },
  flush: { type: Boolean, default: false },
})

const balise = computed(() => (props.to ? RouterLink : props.as))
</script>

<template>
  <component
    :is="balise"
    :to="to || undefined"
    class="m-card"
    :class="[`m-card--${variant}`, `m-card--${tone}`, { 'm-card--flush': flush }]"
  >
    <header v-if="$slots.header" class="m-card__header"><slot name="header" /></header>
    <div class="m-card__body"><slot /></div>
    <footer v-if="$slots.footer" class="m-card__footer"><slot name="footer" /></footer>
  </component>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-card {
    --card-pad: 1.25rem;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-lg);
    background: var(--mimosy-surface);
    color: var(--mimosy-text);
  }

  @media (min-width: 640px) {
    .m-card { --card-pad: 1.5rem; }
  }

  .m-card--raised { background: var(--mimosy-raised); }
  .m-card--sunken { background: var(--mimosy-sunken); border-color: transparent; }

  .m-card--compact { --card-pad: 1rem; border-radius: var(--mimosy-radius-md); }

  .m-card__header,
  .m-card__body,
  .m-card__footer {
    padding: var(--card-pad);
  }

  .m-card__header {
    padding-bottom: 0;
  }

  .m-card__footer {
    border-top: 1px solid var(--mimosy-border);
  }

  .m-card--flush .m-card__body {
    padding: 0;
  }

  .m-card--interactive {
    text-align: left;
    text-decoration: none;
    transition:
      border-color var(--mimosy-duration) var(--mimosy-ease),
      background-color var(--mimosy-duration) var(--mimosy-ease),
      transform var(--mimosy-duration) var(--mimosy-ease-out);
  }

  .m-card--interactive:hover {
    border-color: var(--mimosy-border-strong);
    background: var(--mimosy-raised);
    transform: translateY(-2px);
  }

  .m-card--interactive:focus-visible {
    outline: none;
    box-shadow: var(--mimosy-focus-ring);
  }
}
</style>
