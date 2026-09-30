<script setup>
/**
 * État vide : rien à afficher, et ce n'est pas une erreur.
 * Le message doit dire quoi faire ensuite ; l'action (slot `action` ou
 * props actionLabel/actionTo) est optionnelle.
 */
import MButton from './MButton.vue'

// Props : titre, description, icône, bouton d'action facultatif.
defineProps({
  title: { type: String, default: 'Rien pour le moment' },
  description: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  actionLabel: { type: String, default: '' },
  actionTo: { type: [String, Object], default: null },
  compact: { type: Boolean, default: false },
})

// Événement envoyé au clic sur le bouton (si pas de lien).
defineEmits(['action'])
</script>

<template>
  <div class="m-empty" :class="{ 'm-empty--compact': compact }">
    <span v-if="icon" class="m-empty__icon" aria-hidden="true">
      <component :is="icon" :size="20" :stroke-width="1.6" />
    </span>
    <h3 class="m-empty__title">{{ title }}</h3>
    <p v-if="description" class="m-empty__description">{{ description }}</p>
    <slot />
    <div v-if="$slots.action || actionLabel" class="m-empty__action">
      <slot name="action">
        <MButton variant="outline" size="sm" :to="actionTo" @click="!actionTo && $emit('action')">
          {{ actionLabel }}
        </MButton>
      </slot>
    </div>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1.5rem;
    border: 1px dashed var(--mimosy-border-strong);
    border-radius: var(--mimosy-radius-lg);
    font-family: var(--mimosy-font-sans);
    text-align: center;
  }

  .m-empty--compact {
    padding: 1.75rem 1.25rem;
  }

  .m-empty__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: 1rem;
    border: 1px solid var(--mimosy-border);
    border-radius: 999px;
    background: var(--mimosy-surface);
    color: var(--mimosy-green);
  }

  .m-empty__title {
    font-family: var(--mimosy-font-serif);
    font-size: 1.5rem;
    font-weight: 400;
    line-height: 1.2;
    color: var(--mimosy-text);
  }

  .m-empty--compact .m-empty__title {
    font-family: var(--mimosy-font-sans);
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .m-empty__description {
    max-width: 26rem;
    margin-top: 0.5rem;
    color: var(--mimosy-text-soft);
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .m-empty__action {
    margin-top: 1.25rem;
  }
}
</style>
