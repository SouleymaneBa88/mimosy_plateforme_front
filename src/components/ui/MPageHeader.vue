<script setup>
/**
 * En-tête de page : surtitre, titre, description, actions.
 * `editorial` (par défaut) pose le titre en Instrument Serif ; à désactiver
 * pour les écrans opérationnels denses (admin) où un titre DM Sans
 * s'accorde mieux au reste de l'interface.
 * Slot `back` : lien de retour au-dessus du titre ; slot `meta` : ligne
 * d'informations sous la description (référence, date, statut…).
 */
// Props : titre, surtitre, description, style du titre, balise HTML.
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
  editorial: { type: Boolean, default: true },
  as: { type: String, default: 'h1' },
})
</script>

<template>
  <header class="m-page-header">
    <!-- Lien "retour" facultatif. -->
    <div v-if="$slots.back" class="m-page-header__back"><slot name="back" /></div>

    <div class="m-page-header__row">
      <!-- Colonne de gauche : textes. -->
      <div class="m-page-header__text">
        <p v-if="eyebrow" class="m-page-header__eyebrow text-eyebrow">{{ eyebrow }}</p>
        <component :is="as" class="m-page-header__title" :class="{ 'is-editorial': editorial }">
          <slot name="title">{{ title }}</slot>
        </component>
        <p v-if="description" class="m-page-header__description">{{ description }}</p>
        <div v-if="$slots.meta" class="m-page-header__meta"><slot name="meta" /></div>
      </div>

      <!-- Colonne de droite : boutons d'action. -->
      <div v-if="$slots.actions" class="m-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: var(--mimosy-font-sans);
  }

  .m-page-header__row {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  @media (min-width: 768px) {
    .m-page-header__row {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
  }

  .m-page-header__text {
    min-width: 0;
    max-width: 44rem;
  }

  .m-page-header__eyebrow {
    margin-bottom: 0.6rem;
    color: var(--mimosy-green);
  }

  .m-page-header__title {
    color: var(--mimosy-green-dark);
    font-size: 1.625rem;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .m-page-header__title.is-editorial {
    font-family: var(--mimosy-font-serif);
    font-size: clamp(2rem, 1.5rem + 1.9vw, 2.9rem);
    font-weight: 400;
    line-height: 1.05;
  }

  .m-page-header__description {
    margin-top: 0.6rem;
    color: var(--mimosy-text-soft);
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  .m-page-header__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-top: 0.85rem;
    color: var(--mimosy-text-soft);
    font-size: 0.8125rem;
  }

  .m-page-header__actions {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
}
</style>
