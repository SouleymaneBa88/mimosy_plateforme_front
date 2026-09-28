<script setup>
/**
 * Bouton MIMOSY.
 * Rendu en <button>, en <RouterLink> (prop `to`) ou en <a> (prop `href`).
 * Pendant `loading`, le bouton reste à la même largeur, est désactivé et
 * annonce aria-busy.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  type: { type: String, default: 'button' },
  to: { type: [String, Object], default: null },
  href: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  // Bouton carré ne contenant qu'une icône : aria-label obligatoire côté parent.
  iconOnly: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
  iconRight: { type: [Object, Function], default: null },
})

const inactif = computed(() => props.disabled || props.loading)

const balise = computed(() => {
  if (props.to && !inactif.value) return RouterLink
  if (props.href && !inactif.value) return 'a'
  return 'button'
})

const attributs = computed(() => {
  if (balise.value === RouterLink) return { to: props.to }
  if (balise.value === 'a') return { href: props.href }
  return { type: props.type, disabled: inactif.value }
})

const tailleIcone = computed(() => ({ sm: 15, md: 16, lg: 18 })[props.size])
</script>

<template>
  <component
    :is="balise"
    v-bind="attributs"
    class="m-btn"
    :class="[
      `m-btn--${variant}`,
      `m-btn--${size}`,
      { 'm-btn--block': block, 'm-btn--icon': iconOnly, 'is-loading': loading },
    ]"
    :aria-busy="loading || undefined"
    :aria-disabled="inactif && balise !== 'button' ? 'true' : undefined"
  >
    <span v-if="loading" class="m-btn__spinner m-spin" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" :size="tailleIcone" :stroke-width="1.8" aria-hidden="true" />
    <span v-if="!iconOnly" class="m-btn__label"><slot /></span>
    <slot v-else />
    <component :is="iconRight" v-if="iconRight && !loading" :size="tailleIcone" :stroke-width="1.8" aria-hidden="true" />
  </component>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-btn {
    --btn-bg: transparent;
    --btn-fg: var(--mimosy-text);
    --btn-border: transparent;
    --btn-bg-hover: var(--mimosy-green-mist);
    --btn-fg-hover: var(--btn-fg);
    --btn-border-hover: var(--btn-border);

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid var(--btn-border);
    border-radius: 999px;
    background: var(--btn-bg);
    color: var(--btn-fg);
    font-family: var(--mimosy-font-sans);
    font-weight: 600;
    letter-spacing: 0.005em;
    white-space: nowrap;
    text-decoration: none;
    user-select: none;
    transition:
      background-color var(--mimosy-duration-fast) var(--mimosy-ease),
      border-color var(--mimosy-duration-fast) var(--mimosy-ease),
      color var(--mimosy-duration-fast) var(--mimosy-ease),
      transform var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-btn:hover:not(:disabled):not([aria-disabled='true']) {
    background: var(--btn-bg-hover);
    color: var(--btn-fg-hover);
    border-color: var(--btn-border-hover);
  }

  .m-btn:active:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(1px);
  }

  .m-btn:focus-visible {
    outline: none;
    box-shadow: var(--mimosy-focus-ring);
  }

  .m-btn:disabled,
  .m-btn[aria-disabled='true'] {
    opacity: 0.45;
  }

  .m-btn.is-loading {
    opacity: 0.85;
    cursor: progress;
  }

  /* Tailles — hauteur minimale ≥ 36px, 44px en lg pour les CTA tactiles */
  .m-btn--sm { min-height: 2.25rem; padding: 0 0.9rem; font-size: 0.8125rem; }
  .m-btn--md { min-height: 2.75rem; padding: 0 1.25rem; font-size: 0.875rem; }
  .m-btn--lg { min-height: 3.25rem; padding: 0 1.6rem; font-size: 0.9375rem; }

  .m-btn--icon.m-btn--sm { width: 2.25rem; padding: 0; }
  .m-btn--icon.m-btn--md { width: 2.75rem; padding: 0; }
  .m-btn--icon.m-btn--lg { width: 3.25rem; padding: 0; }

  .m-btn--block { display: flex; width: 100%; }

  /* Variantes */
  .m-btn--primary {
    --btn-bg: var(--mimosy-green);
    --btn-fg: #fff;
    --btn-border: var(--mimosy-green);
    --btn-bg-hover: var(--mimosy-green-dark);
    --btn-border-hover: var(--mimosy-green-dark);
  }

  .m-btn--secondary {
    --btn-bg: var(--mimosy-green-soft);
    --btn-fg: var(--mimosy-green-dark);
    --btn-bg-hover: #D6E4DA;
  }

  .m-btn--outline {
    --btn-bg: var(--mimosy-raised);
    --btn-border: var(--mimosy-border-strong);
    --btn-bg-hover: var(--mimosy-raised);
    --btn-border-hover: var(--mimosy-green);
    --btn-fg-hover: var(--mimosy-green);
  }

  .m-btn--ghost {
    --btn-fg: var(--mimosy-text-soft);
    --btn-bg-hover: var(--mimosy-sunken);
    --btn-fg-hover: var(--mimosy-text);
  }

  .m-btn--danger {
    --btn-bg: var(--mimosy-danger);
    --btn-fg: #fff;
    --btn-border: var(--mimosy-danger);
    --btn-bg-hover: #8A362E;
    --btn-border-hover: #8A362E;
  }

  .m-btn__label {
    display: inline-flex;
    align-items: center;
  }

  .m-btn__spinner {
    width: 1em;
    height: 1em;
    border-radius: 999px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: mimosy-spin 0.7s linear infinite;
  }
}
</style>
