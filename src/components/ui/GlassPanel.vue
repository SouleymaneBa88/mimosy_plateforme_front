<script setup>
/**
 * Panneau en verre : barre de recherche posée sur un visuel, petit overlay,
 * information flottante. À ne PAS utiliser pour les cartes de contenu ni
 * les tableaux : le verre n'a de sens qu'au-dessus d'un fond qui bouge ou
 * d'une image.
 */
defineProps({
  as: { type: String, default: 'div' },
  dense: { type: Boolean, default: false },
  radius: { type: String, default: 'lg', validator: (v) => ['md', 'lg', 'xl', 'full'].includes(v) },
  padding: { type: String, default: 'md', validator: (v) => ['none', 'sm', 'md', 'lg'].includes(v) },
})
</script>

<template>
  <component
    :is="as"
    class="m-glass-panel"
    :class="[dense ? 'glass-dense' : 'glass', `m-glass-panel--r-${radius}`, `m-glass-panel--p-${padding}`]"
  >
    <slot />
  </component>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-glass-panel {
    color: var(--mimosy-text);
  }

  .m-glass-panel--r-md { border-radius: var(--mimosy-radius-md); }
  .m-glass-panel--r-lg { border-radius: var(--mimosy-radius-lg); }
  .m-glass-panel--r-xl { border-radius: var(--mimosy-radius-xl); }
  .m-glass-panel--r-full { border-radius: 999px; }

  .m-glass-panel--p-none { padding: 0; }
  .m-glass-panel--p-sm { padding: 0.5rem; }
  .m-glass-panel--p-md { padding: 1rem; }
  .m-glass-panel--p-lg { padding: 1.5rem; }
}
</style>
