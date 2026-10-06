<!--
  Section de tableau de bord : titre, phrase d'explication, actions à
  droite, contenu. Apparition progressive courte (décalage `ordre`),
  désactivée si l'utilisateur préfère réduire les animations.
-->
<script setup>
defineProps({
  titre: { type: String, required: true },
  description: { type: String, default: '' },
  ordre: { type: Number, default: 0 },
  as: { type: String, default: 'section' },
})
</script>

<template>
  <component :is="as" class="section-db" :style="{ '--reveal-delay': `${ordre * 60}ms` }">
    <header class="section-db__entete">
      <div class="min-w-0">
        <h2 class="section-db__titre">{{ titre }}</h2>
        <p v-if="description" class="section-db__description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="section-db__actions"><slot name="actions" /></div>
    </header>
    <slot />
  </component>
</template>

<style scoped>
.section-db {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--mimosy-border);
  border-radius: var(--mimosy-radius-lg);
  background: var(--mimosy-surface);
  animation: mimosy-rise 0.35s var(--mimosy-ease-out, ease-out) both;
  animation-delay: var(--reveal-delay, 0ms);
}

.section-db__entete {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.section-db__titre {
  margin: 0;
  font-family: var(--mimosy-font-serif);
  font-size: 1.375rem;
  font-weight: 400;
  line-height: 1.75rem;
  color: var(--mimosy-text);
}

.section-db__description {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: var(--mimosy-muted);
}

.section-db__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .section-db { padding: 1.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .section-db { animation: none; }
}
</style>
