<script setup>
/**
 * Onglets / filtres segmentés.
 * `tabs` : [{ value, label, count? }] — `count` n'est affiché que s'il est
 * fourni par la page (donnée réelle), jamais calculé ici.
 * Navigation clavier : flèches gauche/droite, Début, Fin.
 */
import { nextTick, ref } from 'vue'

// v-model : la valeur de l'onglet sélectionné.
const model = defineModel({ type: [String, Number], default: '' })

// Props : la liste des onglets, un libellé pour l'accessibilité, et le style.
const props = defineProps({
  tabs: { type: Array, required: true },
  label: { type: String, default: 'Filtres' },
  variant: { type: String, default: 'line', validator: (v) => ['line', 'pill'].includes(v) },
})

// Références vers les boutons (pour déplacer le focus au clavier).
const boutons = ref([])

// Sélectionne un onglet.
function selectionner(valeur) {
  model.value = valeur
}

// Navigation au clavier : flèches, Début et Fin.
async function onKeydown(evenement, index) {
  const dernier = props.tabs.length - 1
  // Pour chaque touche, l'index de l'onglet à atteindre (on boucle aux extrémités).
  const cibles = { ArrowRight: index === dernier ? 0 : index + 1, ArrowLeft: index === 0 ? dernier : index - 1, Home: 0, End: dernier }
  if (!(evenement.key in cibles)) return
  evenement.preventDefault()
  const cible = cibles[evenement.key]
  selectionner(props.tabs[cible].value)
  // On attend la mise à jour de l'affichage, puis on place le focus sur le nouvel onglet.
  await nextTick()
  boutons.value[cible]?.focus()
}
</script>

<template>
  <div class="m-tabs" :class="`m-tabs--${variant}`" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      :ref="(el) => (boutons[index] = el)"
      type="button"
      role="tab"
      class="m-tabs__tab"
      :aria-selected="model === tab.value"
      :tabindex="model === tab.value ? 0 : -1"
      @click="selectionner(tab.value)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
      <!-- Le compteur n'est affiché que s'il est fourni. -->
      <span v-if="tab.count !== undefined && tab.count !== null" class="m-tabs__count tabular">{{ tab.count }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-tabs {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
    font-family: var(--mimosy-font-sans);
  }

  .m-tabs::-webkit-scrollbar { display: none; }

  .m-tabs__tab {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.5rem;
    padding: 0 0.9rem;
    color: var(--mimosy-text-soft);
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    transition:
      color var(--mimosy-duration-fast) var(--mimosy-ease),
      background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-tabs__tab:hover { color: var(--mimosy-text); }

  .m-tabs__tab[aria-selected='true'] {
    color: var(--mimosy-text);
    font-weight: 600;
  }

  .m-tabs__count {
    min-width: 1.35rem;
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    background: var(--mimosy-sunken);
    color: var(--mimosy-text-soft);
    font-size: 0.6875rem;
    font-weight: 600;
    text-align: center;
  }

  /* Soulignement */
  .m-tabs--line {
    border-bottom: 1px solid var(--mimosy-border);
    gap: 0.5rem;
  }

  .m-tabs--line .m-tabs__tab {
    padding: 0 0.25rem;
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
  }

  .m-tabs--line .m-tabs__tab[aria-selected='true'] {
    border-bottom-color: var(--mimosy-green);
  }

  /* Segmenté */
  .m-tabs--pill {
    width: fit-content;
    max-width: 100%;
    padding: 0.25rem;
    border: 1px solid var(--mimosy-border);
    border-radius: 999px;
    background: var(--mimosy-surface);
  }

  .m-tabs--pill .m-tabs__tab {
    min-height: 2.25rem;
    border-radius: 999px;
  }

  .m-tabs--pill .m-tabs__tab[aria-selected='true'] {
    background: var(--mimosy-green-dark);
    color: var(--mimosy-bg);
  }

  .m-tabs--pill .m-tabs__tab[aria-selected='true'] .m-tabs__count {
    background: rgba(255, 253, 249, 0.16);
    color: var(--mimosy-bg);
  }
}
</style>
