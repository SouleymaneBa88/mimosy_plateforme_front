<script setup>
/**
 * Modale MIMOSY.
 * v-model contrôle l'ouverture. Sur mobile, la modale devient une feuille
 * ancrée en bas de l'écran ; sur desktop, un panneau centré.
 * Slots : default (contenu scrollable), footer (actions), header (remplace
 * le titre si besoin).
 * `persistent` empêche la fermeture par clic extérieur / Échap (ex. pendant
 * une soumission).
 */
import { computed, ref, toRef, useId } from 'vue'
import { X } from 'lucide-vue-next'

// Le comportement commun des fenêtres (Échap, focus, scroll bloqué).
import { useDialog } from './useDialog'

// v-model : true = ouverte, false = fermée.
const ouvert = defineModel({ type: Boolean, default: false })

// Options : titre, description, taille, et "persistent" (impossible à fermer).
const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v) },
  persistent: { type: Boolean, default: false },
})

// Événement envoyé à la fermeture.
const emit = defineEmits(['close'])

// Référence vers l'élément HTML de la fenêtre.
const panneau = ref(null)
// Identifiants uniques pour relier le titre et la description (accessibilité).
const autoId = useId()
const titreId = computed(() => `m-modal-titre-${autoId}`)
const descriptionId = computed(() => `m-modal-desc-${autoId}`)

// Ferme la fenêtre (sauf si elle est "persistent").
function fermer() {
  if (props.persistent) return
  ouvert.value = false
  emit('close')
}

// On branche le comportement commun : Échap, focus piégé, scroll bloqué.
const { onKeydown } = useDialog(toRef(ouvert), panneau, fermer, {
  fermerAvecEchap: () => !props.persistent,
})
</script>

<template>
  <Teleport to="body">
    <!-- Fond gris : un clic dessus (et pas sur la fenêtre) ferme la fenêtre. -->
    <Transition name="m-fade">
      <div v-if="ouvert" class="m-modal__overlay" @click.self="fermer">
        <Transition name="m-pop" appear>
          <section
            ref="panneau"
            class="m-modal"
            :class="`m-modal--${size}`"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? titreId : undefined"
            :aria-describedby="description ? descriptionId : undefined"
            tabindex="-1"
            @keydown="onKeydown"
          >
            <!-- En-tête : titre + description + bouton fermer. -->
            <header v-if="title || $slots.header" class="m-modal__header">
              <slot name="header">
                <div class="min-w-0">
                  <h2 :id="titreId" class="m-modal__title">{{ title }}</h2>
                  <p v-if="description" :id="descriptionId" class="m-modal__description">{{ description }}</p>
                </div>
              </slot>
              <button
                v-if="!persistent"
                type="button"
                class="m-modal__close"
                aria-label="Fermer"
                @click="fermer"
              >
                <X :size="18" :stroke-width="1.8" aria-hidden="true" />
              </button>
            </header>

            <!-- Contenu principal (slot par défaut). -->
            <div class="m-modal__body">
              <slot />
            </div>

            <!-- Pied de fenêtre (boutons d'action), seulement si fourni. -->
            <footer v-if="$slots.footer" class="m-modal__footer">
              <slot name="footer" />
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-modal__overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(5, 31, 32, 0.42);
  }

  .m-modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 92dvh;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-xl) var(--mimosy-radius-xl) 0 0;
    background: var(--mimosy-bg);
    color: var(--mimosy-text);
    font-family: var(--mimosy-font-sans);
    outline: none;
  }

  @media (min-width: 640px) {
    .m-modal__overlay {
      align-items: center;
      padding: 1.5rem;
    }

    .m-modal {
      max-height: 86dvh;
      border-radius: var(--mimosy-radius-xl);
    }

    .m-modal--sm { max-width: 26rem; }
    .m-modal--md { max-width: 34rem; }
    .m-modal--lg { max-width: 46rem; }
    .m-modal--xl { max-width: 60rem; }
  }

  .m-modal__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.35rem 1.5rem 1rem;
    border-bottom: 1px solid var(--mimosy-border);
  }

  .m-modal__title {
    font-family: var(--mimosy-font-serif);
    font-size: 1.6rem;
    font-weight: 400;
    line-height: 1.15;
  }

  .m-modal__description {
    margin-top: 0.35rem;
    color: var(--mimosy-text-soft);
    font-size: 0.875rem;
  }

  .m-modal__close {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    margin: -0.25rem -0.5rem 0 0;
    border-radius: 999px;
    color: var(--mimosy-text-soft);
    transition: background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-modal__close:hover {
    background: var(--mimosy-sunken);
    color: var(--mimosy-text);
  }

  .m-modal__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .m-modal__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem calc(1rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--mimosy-border);
    background: var(--mimosy-surface);
    border-radius: 0 0 var(--mimosy-radius-xl) var(--mimosy-radius-xl);
  }

  @media (max-width: 639px) {
    .m-modal__footer {
      border-radius: 0;
    }

    .m-modal__footer > :deep(*) {
      flex: 1;
    }
  }
}
</style>
