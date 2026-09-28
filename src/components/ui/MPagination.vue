<script setup>
/**
 * Pagination — même contrat que common/Pagination.vue (props page, count,
 * pageSize ; événement update:page) et même calcul du nombre de pages, pour
 * pouvoir remplacer l'ancien composant sans toucher aux pages.
 * Seul le rendu change : numéros de page (avec ellipses) à partir de sm.
 */
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, required: true },
  count: { type: Number, required: true },
  pageSize: { type: Number, default: 20 },
})
const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.count / props.pageSize)))

function aller(page) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}

// 1 … 4 5 6 … 12 : première, dernière, et la page courante ± 1.
const numeros = computed(() => {
  const total = totalPages.value
  const courante = props.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, courante - 1, courante, courante + 1])
  const tries = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const resultat = []
  tries.forEach((p, i) => {
    if (i && p - tries[i - 1] > 1) resultat.push(`ellipse-${p}`)
    resultat.push(p)
  })
  return resultat
})

const debut = computed(() => (props.page - 1) * props.pageSize + 1)
const fin = computed(() => Math.min(props.page * props.pageSize, props.count))
</script>

<template>
  <nav v-if="totalPages > 1" class="m-pagination" aria-label="Pagination">
    <p class="m-pagination__summary tabular">
      {{ debut }}–{{ fin }} sur {{ count }} résultat{{ count > 1 ? 's' : '' }}
    </p>

    <div class="m-pagination__controls">
      <button
        type="button"
        class="m-pagination__btn m-pagination__btn--nav"
        :disabled="page <= 1"
        aria-label="Page précédente"
        @click="aller(page - 1)"
      >
        <ChevronLeft :size="16" :stroke-width="1.8" aria-hidden="true" />
        <span class="m-pagination__nav-label">Précédent</span>
      </button>

      <ul class="m-pagination__pages">
        <li v-for="numero in numeros" :key="numero">
          <span v-if="typeof numero === 'string'" class="m-pagination__ellipsis" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="m-pagination__btn m-pagination__btn--page tabular"
            :aria-current="numero === page ? 'page' : undefined"
            :aria-label="`Page ${numero}`"
            @click="aller(numero)"
          >
            {{ numero }}
          </button>
        </li>
      </ul>

      <span class="m-pagination__compact tabular" aria-hidden="true">{{ page }} / {{ totalPages }}</span>

      <button
        type="button"
        class="m-pagination__btn m-pagination__btn--nav"
        :disabled="page >= totalPages"
        aria-label="Page suivante"
        @click="aller(page + 1)"
      >
        <span class="m-pagination__nav-label">Suivant</span>
        <ChevronRight :size="16" :stroke-width="1.8" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    padding: 0.5rem 0;
    font-family: var(--mimosy-font-sans);
    font-size: 0.8125rem;
  }

  .m-pagination__summary {
    color: var(--mimosy-text-soft);
  }

  .m-pagination__controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .m-pagination__pages {
    display: none;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .m-pagination__compact {
    padding: 0 0.5rem;
    color: var(--mimosy-text-soft);
  }

  @media (min-width: 640px) {
    .m-pagination__pages { display: flex; }
    .m-pagination__compact { display: none; }
  }

  .m-pagination__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 2.25rem;
    height: 2.25rem;
    border: 1px solid transparent;
    border-radius: 999px;
    color: var(--mimosy-text);
    font-weight: 500;
    transition:
      background-color var(--mimosy-duration-fast) var(--mimosy-ease),
      border-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-pagination__btn:hover:not(:disabled) {
    background: var(--mimosy-sunken);
  }

  .m-pagination__btn:disabled {
    opacity: 0.35;
  }

  .m-pagination__btn--nav {
    padding: 0 0.75rem;
    border-color: var(--mimosy-border);
  }

  .m-pagination__nav-label {
    display: none;
  }

  @media (min-width: 640px) {
    .m-pagination__nav-label { display: inline; }
  }

  .m-pagination__btn--page[aria-current='page'] {
    background: var(--mimosy-green-dark);
    color: var(--mimosy-bg);
    font-weight: 600;
  }

  .m-pagination__ellipsis {
    display: inline-flex;
    width: 1.5rem;
    justify-content: center;
    color: var(--mimosy-muted);
  }
}
</style>
