<script setup>
/**
 * Base commune des headers en verre (landing et espace client).
 *
 * variant="floating" (landing) : barre détachée des bords, arrondie, qui
 *   flotte au-dessus du hero ; se resserre légèrement après le scroll.
 * variant="bar" (client)       : barre pleine largeur collée en haut, plus
 *   basse, verre plus discret.
 *
 * Avant scroll : verre léger. Après : verre dense + bordure plus nette.
 * Aucune ombre dans les deux cas.
 *
 * Slots :
 *   brand   → logo
 *   nav     → navigation desktop (masquée sous `navBreakpoint`)
 *   actions → boutons / avatar / notifications, toujours visibles
 *   mobile  → contenu du menu mobile (props : close)
 * Le bouton burger n'apparaît que si le slot `mobile` est fourni.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'

import { useScrolled } from '@/composables/useScrolled'

const props = defineProps({
  variant: { type: String, default: 'bar', validator: (v) => ['floating', 'bar'].includes(v) },
  // Largeur à partir de laquelle la nav desktop remplace le burger.
  navBreakpoint: { type: String, default: 'lg', validator: (v) => ['md', 'lg'].includes(v) },
  label: { type: String, default: 'Navigation principale' },
  // Forcer l'état dense (ex. page sans visuel derrière le header).
  dense: { type: Boolean, default: false },
})

const slots = useSlots()
const route = useRoute()
const { scrolled } = useScrolled(8)

const menuOuvert = ref(false)
const menuId = `m-glass-menu-${useId()}`

const estDense = computed(() => props.dense || scrolled.value || menuOuvert.value)

function fermer() {
  menuOuvert.value = false
}

function onKeydown(evenement) {
  if (evenement.key === 'Escape' && menuOuvert.value) fermer()
}

watch(() => route?.fullPath, fermer)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header
    class="m-glass-header"
    :class="[`m-glass-header--${variant}`, `m-glass-header--nav-${navBreakpoint}`, { 'is-dense': estDense, 'is-open': menuOuvert }]"
  >
    <div class="m-glass-header__shell">
      <div class="m-glass-header__row">
        <div class="m-glass-header__brand"><slot name="brand" /></div>

        <nav v-if="slots.nav" class="m-glass-header__nav" :aria-label="label">
          <slot name="nav" />
        </nav>

        <div class="m-glass-header__actions">
          <slot name="actions" />

          <button
            v-if="slots.mobile"
            type="button"
            class="m-glass-header__burger"
            :aria-expanded="menuOuvert"
            :aria-controls="menuId"
            :aria-label="menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
            @click="menuOuvert = !menuOuvert"
          >
            <X v-if="menuOuvert" :size="20" :stroke-width="1.8" aria-hidden="true" />
            <Menu v-else :size="20" :stroke-width="1.8" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Transition name="m-drop">
        <div v-if="slots.mobile && menuOuvert" :id="menuId" class="m-glass-header__mobile">
          <slot name="mobile" :close="fermer" />
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-glass-header {
    position: sticky;
    top: 0;
    z-index: 50;
    font-family: var(--mimosy-font-sans);
  }

  /* Mêmes valeurs que les utilitaires glass / glass-dense (tokens), posées
     ici pour que la variante « bar » puisse ne garder que la bordure basse. */
  .m-glass-header__shell {
    border: 1px solid var(--mimosy-glass-border);
    background-color: var(--mimosy-glass-bg);
    -webkit-backdrop-filter: blur(var(--mimosy-glass-blur)) saturate(140%);
    backdrop-filter: blur(var(--mimosy-glass-blur)) saturate(140%);
    transition:
      background-color var(--mimosy-duration-slow) var(--mimosy-ease),
      border-color var(--mimosy-duration-slow) var(--mimosy-ease),
      border-radius var(--mimosy-duration-slow) var(--mimosy-ease),
      max-width var(--mimosy-duration-slow) var(--mimosy-ease-out);
  }

  .is-dense .m-glass-header__shell {
    border-color: var(--mimosy-glass-border-dense);
    background-color: var(--mimosy-glass-bg-dense);
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .m-glass-header__shell { background-color: rgba(255, 253, 249, 0.97); }
  }

  .m-glass-header__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    height: var(--mimosy-header-h);
  }

  .m-glass-header__brand {
    display: flex;
    flex-shrink: 0;
    align-items: center;
  }

  .m-glass-header__nav {
    display: none;
    min-width: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .m-glass-header__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
  }

  .m-glass-header__burger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    color: var(--mimosy-text);
    transition: background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-glass-header__burger:hover {
    background: rgba(28, 36, 32, 0.06);
  }

  .m-glass-header__mobile {
    padding: 0.5rem 0 1rem;
    border-top: 1px solid var(--mimosy-glass-border);
  }

  /* Bascule nav desktop / burger */
  @media (min-width: 768px) {
    .m-glass-header--nav-md .m-glass-header__nav { display: flex; }
    .m-glass-header--nav-md .m-glass-header__burger,
    .m-glass-header--nav-md .m-glass-header__mobile { display: none; }
  }

  @media (min-width: 1024px) {
    .m-glass-header--nav-lg .m-glass-header__nav { display: flex; }
    .m-glass-header--nav-lg .m-glass-header__burger,
    .m-glass-header--nav-lg .m-glass-header__mobile { display: none; }
  }

  /* ---------- Barre (client) ---------- */
  .m-glass-header--bar .m-glass-header__shell {
    border-width: 0 0 1px;
    border-radius: 0;
  }

  .m-glass-header--bar .m-glass-header__row,
  .m-glass-header--bar .m-glass-header__mobile {
    padding-inline: var(--mimosy-gutter);
  }

  /* ---------- Flottant (landing) ---------- */
  .m-glass-header--floating {
    padding: 0.75rem var(--mimosy-gutter) 0;
  }

  .m-glass-header--floating .m-glass-header__shell {
    max-width: 1240px;
    margin-inline: auto;
    border-radius: var(--mimosy-radius-xl);
  }

  .m-glass-header--floating .m-glass-header__row {
    padding-inline: 1rem 0.6rem;
  }

  .m-glass-header--floating .m-glass-header__mobile {
    padding-inline: 0.75rem;
  }

  @media (min-width: 640px) {
    .m-glass-header--floating { padding-top: 1rem; }
    .m-glass-header--floating .m-glass-header__row { padding-inline: 1.4rem 0.75rem; }
  }

  /* Après scroll : la barre se resserre de quelques pixels, sans bouger le
     contenu (hauteur de ligne inchangée). */
  @media (min-width: 1024px) {
    .m-glass-header--floating.is-dense .m-glass-header__shell {
      max-width: 1180px;
    }
  }
}
</style>
