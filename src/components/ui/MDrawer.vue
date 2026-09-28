<script setup>
/**
 * Tiroir latéral ou bas d'écran : filtres mobiles, navigation, détail.
 * - side="right" | "left" : panneau latéral (max 420px)
 * - side="bottom"         : feuille mobile, hauteur limitée à 88% de l'écran
 * Même accessibilité que MModal (Échap, focus piégé, scroll bloqué).
 */
import { computed, ref, toRef, useId } from 'vue'
import { X } from 'lucide-vue-next'

import { useDialog } from './useDialog'

const ouvert = defineModel({ type: Boolean, default: false })

const props = defineProps({
  title: { type: String, default: '' },
  side: { type: String, default: 'right', validator: (v) => ['left', 'right', 'bottom'].includes(v) },
  width: { type: String, default: '420px' },
})

const emit = defineEmits(['close'])

const panneau = ref(null)
const autoId = useId()
const titreId = computed(() => `m-drawer-titre-${autoId}`)

function fermer() {
  ouvert.value = false
  emit('close')
}

const { onKeydown } = useDialog(toRef(ouvert), panneau, fermer)
</script>

<template>
  <Teleport to="body">
    <Transition name="m-fade">
      <div v-if="ouvert" class="m-drawer__overlay" aria-hidden="true" @click="fermer" />
    </Transition>

    <Transition :name="`m-drawer-${side}`">
      <aside
        v-if="ouvert"
        ref="panneau"
        class="m-drawer"
        :class="`m-drawer--${side}`"
        :style="side !== 'bottom' ? { width: `min(${width}, 88vw)` } : undefined"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titreId : undefined"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <span v-if="side === 'bottom'" class="m-drawer__grip" aria-hidden="true" />

        <header class="m-drawer__header">
          <slot name="header">
            <h2 v-if="title" :id="titreId" class="m-drawer__title">{{ title }}</h2>
          </slot>
          <button type="button" class="m-drawer__close" aria-label="Fermer" @click="fermer">
            <X :size="18" :stroke-width="1.8" aria-hidden="true" />
          </button>
        </header>

        <div class="m-drawer__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="m-drawer__footer">
          <slot name="footer" />
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-drawer__overlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    background: rgba(5, 31, 32, 0.36);
  }

  .m-drawer {
    position: fixed;
    z-index: 901;
    display: flex;
    flex-direction: column;
    background: var(--mimosy-bg);
    color: var(--mimosy-text);
    font-family: var(--mimosy-font-sans);
    outline: none;
  }

  .m-drawer--right,
  .m-drawer--left {
    top: 0;
    bottom: 0;
  }

  .m-drawer--right { right: 0; border-left: 1px solid var(--mimosy-border); }
  .m-drawer--left { left: 0; border-right: 1px solid var(--mimosy-border); }

  .m-drawer--bottom {
    right: 0;
    bottom: 0;
    left: 0;
    max-height: 88dvh;
    border-top: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-xl) var(--mimosy-radius-xl) 0 0;
  }

  .m-drawer__grip {
    align-self: center;
    width: 2.5rem;
    height: 4px;
    margin-top: 0.6rem;
    border-radius: 999px;
    background: var(--mimosy-border-strong);
  }

  .m-drawer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--mimosy-border);
  }

  .m-drawer__title {
    font-size: 1rem;
    font-weight: 600;
  }

  .m-drawer__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    margin-right: -0.4rem;
    border-radius: 999px;
    color: var(--mimosy-text-soft);
    transition: background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-drawer__close:hover {
    background: var(--mimosy-sunken);
    color: var(--mimosy-text);
  }

  .m-drawer__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem;
  }

  .m-drawer__footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--mimosy-border);
    background: var(--mimosy-surface);
  }

  .m-drawer__footer > :deep(*) {
    flex: 1;
  }

  /* Entrées / sorties : glissement court depuis le bord concerné */
  .m-drawer-right-enter-active,
  .m-drawer-right-leave-active,
  .m-drawer-left-enter-active,
  .m-drawer-left-leave-active,
  .m-drawer-bottom-enter-active,
  .m-drawer-bottom-leave-active {
    transition: transform 280ms var(--mimosy-ease-out);
  }

  .m-drawer-right-enter-from,
  .m-drawer-right-leave-to { transform: translateX(100%); }

  .m-drawer-left-enter-from,
  .m-drawer-left-leave-to { transform: translateX(-100%); }

  .m-drawer-bottom-enter-from,
  .m-drawer-bottom-leave-to { transform: translateY(100%); }
}
</style>
