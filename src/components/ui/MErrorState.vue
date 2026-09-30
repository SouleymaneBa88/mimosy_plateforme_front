<script setup>
/**
 * État d'erreur : le chargement a échoué.
 * Ton calme (pas de grand bloc rouge) : on dit ce qui s'est passé en
 * langage courant et on propose de réessayer. Le message technique de
 * l'API ne doit être passé en `message` que s'il est compréhensible.
 */
import { CircleAlert, RotateCcw } from 'lucide-vue-next'

import MButton from './MButton.vue'

// Props : titre, message, texte du bouton, affichage du bouton, chargement...
defineProps({
  title: { type: String, default: 'Impossible de charger ces informations' },
  message: { type: String, default: 'Vérifiez votre connexion puis réessayez.' },
  retryLabel: { type: String, default: 'Réessayer' },
  // Afficher le bouton : la page doit écouter @retry.
  retry: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

// Événement envoyé au clic sur "Réessayer".
defineEmits(['retry'])
</script>

<template>
  <div class="m-error" :class="{ 'm-error--compact': compact }" role="alert">
    <CircleAlert class="m-error__icon" :size="20" :stroke-width="1.7" aria-hidden="true" />
    <div class="m-error__content">
      <p class="m-error__title">{{ title }}</p>
      <p v-if="message" class="m-error__message">{{ message }}</p>
      <slot />
    </div>
    <MButton
      v-if="retry"
      class="m-error__retry"
      variant="outline"
      size="sm"
      :icon="RotateCcw"
      :loading="loading"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </MButton>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-error {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.85rem 1rem;
    padding: 1.25rem;
    border: 1px solid #EBD3CE;
    border-left: 3px solid var(--mimosy-danger);
    border-radius: var(--mimosy-radius-md);
    background: #FDF7F5;
    font-family: var(--mimosy-font-sans);
  }

  .m-error__icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--mimosy-danger);
  }

  .m-error__content {
    flex: 1;
    min-width: 12rem;
  }

  .m-error__title {
    color: var(--mimosy-text);
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .m-error__message {
    margin-top: 0.25rem;
    color: var(--mimosy-text-soft);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .m-error__retry {
    flex-shrink: 0;
  }

  .m-error--compact {
    padding: 0.85rem 1rem;
  }
}
</style>
