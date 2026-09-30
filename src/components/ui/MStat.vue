<script setup>
/**
 * Indicateur chiffré.
 * N'affiche que ce que la page lui donne : `value` null / undefined → tiret,
 * jamais de valeur par défaut. `delta` (nombre, en %) n'est montré que s'il
 * est fourni par l'API ; `deltaLabel` précise la période (« vs mois dernier »).
 * `to` rend l'indicateur cliquable vers la liste concernée.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'

// Props : libellé, valeur, texte d'aide, variation en % (delta), icône, lien...
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: null },
  hint: { type: String, default: '' },
  delta: { type: Number, default: null },
  deltaLabel: { type: String, default: '' },
  // Pour une baisse souhaitable (ex. litiges ouverts) : inverse les couleurs.
  invertDelta: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
  loading: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
})

// La valeur affichée : un tiret si aucune valeur n'est fournie.
const valeurAffichee = computed(() =>
  props.value === null || props.value === undefined || props.value === '' ? '—' : props.value,
)

// Y a-t-il une variation à afficher ? Est-ce une hausse ? Est-ce une bonne nouvelle ?
const aDelta = computed(() => typeof props.delta === 'number' && Number.isFinite(props.delta))
const hausse = computed(() => props.delta > 0)
const favorable = computed(() => (props.invertDelta ? props.delta < 0 : props.delta > 0))
// Texte de la variation, ex. "+12,5 %".
const deltaTexte = computed(() => {
  const arrondi = Math.round(Math.abs(props.delta) * 10) / 10
  return `${props.delta > 0 ? '+' : props.delta < 0 ? '−' : ''}${String(arrondi).replace('.', ',')} %`
})
</script>

<template>
  <!-- Un lien si "to" est fourni, sinon une simple <div>. -->
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="m-stat"
    :class="[`m-stat--${size}`, { 'm-stat--link': to }]"
    :aria-busy="loading || undefined"
  >
    <div class="m-stat__head">
      <span class="m-stat__label">{{ label }}</span>
      <component :is="icon" v-if="icon" class="m-stat__icon" :size="16" :stroke-width="1.7" aria-hidden="true" />
    </div>

    <!-- Pendant le chargement : un bloc gris animé ; sinon la valeur. -->
    <span v-if="loading" class="m-stat__skeleton" aria-hidden="true" />
    <span v-else class="m-stat__value tabular">{{ valeurAffichee }}</span>
    <span v-if="loading" class="sr-only">Chargement de {{ label }}</span>

    <!-- Le pied : la variation et/ou le texte d'aide. -->
    <div v-if="!loading && (aDelta || hint)" class="m-stat__foot">
      <span
        v-if="aDelta && delta !== 0"
        class="m-stat__delta"
        :class="favorable ? 'is-good' : 'is-bad'"
      >
        <component :is="hausse ? ArrowUpRight : ArrowDownRight" :size="13" :stroke-width="2" aria-hidden="true" />
        {{ deltaTexte }}
      </span>
      <span v-if="deltaLabel && aDelta" class="m-stat__hint">{{ deltaLabel }}</span>
      <span v-else-if="hint" class="m-stat__hint">{{ hint }}</span>
    </div>
  </component>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-stat {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.1rem 1.25rem 1.2rem;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-lg);
    background: var(--mimosy-surface);
    color: var(--mimosy-text);
    font-family: var(--mimosy-font-sans);
    text-decoration: none;
  }

  .m-stat--link {
    transition:
      border-color var(--mimosy-duration) var(--mimosy-ease),
      background-color var(--mimosy-duration) var(--mimosy-ease);
  }

  .m-stat--link:hover {
    border-color: var(--mimosy-border-strong);
    background: var(--mimosy-raised);
  }

  .m-stat__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .m-stat__label {
    color: var(--mimosy-text-soft);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .m-stat__icon {
    flex-shrink: 0;
    color: var(--mimosy-muted);
  }

  .m-stat__value {
    font-family: var(--mimosy-font-serif);
    font-size: 2.25rem;
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }

  .m-stat--sm .m-stat__value {
    font-family: var(--mimosy-font-sans);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .m-stat--lg .m-stat__value {
    font-size: 3rem;
  }

  .m-stat__skeleton {
    display: block;
    width: 45%;
    height: 2.25rem;
    border-radius: var(--mimosy-radius-sm);
    background: var(--mimosy-sunken);
    animation: mimosy-skeleton 1.8s ease-in-out infinite;
  }

  .m-stat__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
  }

  .m-stat__delta {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    font-weight: 600;
  }

  .m-stat__delta.is-good { color: var(--mimosy-success); }
  .m-stat__delta.is-bad { color: var(--mimosy-danger); }

  .m-stat__hint {
    color: var(--mimosy-muted);
  }
}
</style>
