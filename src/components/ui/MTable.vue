<script setup>
/**
 * Tableau responsive.
 *
 * Desktop (≥ breakpoint) : vrai <table>, lignes denses.
 * Mobile : chaque ligne devient une carte — colonne(s) `primary` en titre,
 * les autres en paires libellé / valeur, actions en pied de carte. Les
 * colonnes marquées `hideOnMobile` sont retirées de la carte (à réserver
 * aux informations secondaires). Pas de scroll horizontal par défaut.
 *
 * columns : [{ key, label, align?: 'left'|'right'|'center', primary?,
 *              hideOnMobile?, width?, class? }]
 * Slots   : cell-<key>="{ row, value }", actions="{ row }", empty, caption
 * Événement `row-click` émis uniquement si `clickable`.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import MLoader from './MLoader.vue'

// Props : colonnes, lignes, clé unique de ligne, chargement, lignes cliquables...
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: 'id' },
  loading: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  caption: { type: String, default: '' },
  emptyText: { type: String, default: 'Aucun élément à afficher.' },
  breakpoint: { type: Number, default: 768 },
  skeletonRows: { type: Number, default: 5 },
})

// Événement envoyé quand on clique sur une ligne.
const emit = defineEmits(['row-click'])

// true sur petit écran (affichage en cartes).
const estMobile = ref(false)
// La "media query" qui surveille la largeur de l'écran.
let requete = null

// Met à jour estMobile selon la largeur actuelle.
function majBreakpoint() {
  estMobile.value = !requete.matches
}

// Au montage : on commence à surveiller la largeur de l'écran.
onMounted(() => {
  requete = window.matchMedia(`(min-width: ${props.breakpoint}px)`)
  majBreakpoint()
  requete.addEventListener('change', majBreakpoint)
})

// Au démontage : on arrête de surveiller.
onBeforeUnmount(() => requete?.removeEventListener('change', majBreakpoint))

// Renvoie la clé unique d'une ligne (utilisée par v-for).
function cle(row, index) {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  return row?.[props.rowKey] ?? index
}

// Accès « a.b.c » pour les colonnes imbriquées (client.nom…).
function valeur(row, key) {
  return String(key)
    .split('.')
    .reduce((acc, part) => (acc == null ? acc : acc[part]), row)
}

// Colonnes affichées en titre des cartes mobiles (sinon la première colonne).
const colonnesPrincipales = computed(() => {
  const principales = props.columns.filter((c) => c.primary)
  return principales.length ? principales : props.columns.slice(0, 1)
})

// Les autres colonnes, affichées en "libellé : valeur" dans les cartes.
const colonnesSecondaires = computed(() =>
  props.columns.filter((c) => !colonnesPrincipales.value.includes(c) && !c.hideOnMobile),
)

// Clic sur une ligne.
function onRowClick(row) {
  if (props.clickable) emit('row-click', row)
}

// Touche Entrée ou Espace sur une ligne = même effet qu'un clic.
function onRowKeydown(evenement, row) {
  if (!props.clickable) return
  if (evenement.key === 'Enter' || evenement.key === ' ') {
    evenement.preventDefault()
    emit('row-click', row)
  }
}
</script>

<template>
  <div class="m-table" :aria-busy="loading || undefined">
    <!-- Chargement -->
    <div v-if="loading" class="m-table__loading">
      <MLoader variant="skeleton" :lines="skeletonRows" />
    </div>

    <!-- Vide -->
    <div v-else-if="!rows.length" class="m-table__empty">
      <slot name="empty">
        <p>{{ emptyText }}</p>
      </slot>
    </div>

    <!-- Mobile : cartes -->
    <ul v-else-if="estMobile" class="m-table__cards" :aria-label="caption || undefined">
      <li
        v-for="(row, index) in rows"
        :key="cle(row, index)"
        class="m-table__card"
        :class="{ 'is-clickable': clickable }"
        :tabindex="clickable ? 0 : undefined"
        :role="clickable ? 'button' : undefined"
        @click="onRowClick(row)"
        @keydown="onRowKeydown($event, row)"
      >
        <div class="m-table__card-head">
          <div v-for="col in colonnesPrincipales" :key="col.key" class="m-table__card-primary">
            <slot :name="`cell-${col.key}`" :row="row" :value="valeur(row, col.key)">
              {{ valeur(row, col.key) ?? '—' }}
            </slot>
          </div>
        </div>

        <dl v-if="colonnesSecondaires.length" class="m-table__card-list">
          <div v-for="col in colonnesSecondaires" :key="col.key" class="m-table__card-row">
            <dt>{{ col.label }}</dt>
            <dd>
              <slot :name="`cell-${col.key}`" :row="row" :value="valeur(row, col.key)">
                {{ valeur(row, col.key) ?? '—' }}
              </slot>
            </dd>
          </div>
        </dl>

        <div v-if="$slots.actions" class="m-table__card-actions" @click.stop>
          <slot name="actions" :row="row" />
        </div>
      </li>
    </ul>

    <!-- Desktop : tableau -->
    <table v-else class="m-table__table">
      <caption v-if="caption || $slots.caption" class="sr-only">
        <slot name="caption">{{ caption }}</slot>
      </caption>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :style="col.width ? { width: col.width } : undefined"
            :class="[`is-${col.align || 'left'}`, col.class]"
          >
            {{ col.label }}
          </th>
          <th v-if="$slots.actions" scope="col" class="is-right">
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="cle(row, index)"
          :class="{ 'is-clickable': clickable }"
          :tabindex="clickable ? 0 : undefined"
          @click="onRowClick(row)"
          @keydown="onRowKeydown($event, row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[`is-${col.align || 'left'}`, col.class, { 'is-primary': col.primary }]"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="valeur(row, col.key)">
              {{ valeur(row, col.key) ?? '—' }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="is-right m-table__actions" @click.stop>
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-table {
    font-family: var(--mimosy-font-sans);
    color: var(--mimosy-text);
  }

  .m-table__loading {
    padding: 1.25rem;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-lg);
    background: var(--mimosy-surface);
  }

  .m-table__empty {
    padding: 2.5rem 1.25rem;
    border: 1px dashed var(--mimosy-border-strong);
    border-radius: var(--mimosy-radius-lg);
    color: var(--mimosy-text-soft);
    font-size: 0.875rem;
    text-align: center;
  }

  /* ---------- Desktop ---------- */
  .m-table__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-lg);
    background: var(--mimosy-raised);
    font-size: 0.875rem;
    overflow: hidden;
  }

  .m-table__table th {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--mimosy-border);
    background: var(--mimosy-surface);
    color: var(--mimosy-text-soft);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .m-table__table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--mimosy-border);
    vertical-align: middle;
  }

  .m-table__table tbody tr:last-child td {
    border-bottom: 0;
  }

  .m-table__table td.is-primary {
    font-weight: 600;
  }

  .is-left { text-align: left; }
  .is-right { text-align: right; }
  .is-center { text-align: center; }

  .m-table__table tbody tr {
    transition: background-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-table__table tbody tr:hover {
    background: var(--mimosy-green-mist);
  }

  .m-table__table tbody tr.is-clickable {
    cursor: pointer;
  }

  .m-table__table tbody tr:focus-visible {
    outline: 2px solid var(--mimosy-green);
    outline-offset: -2px;
  }

  .m-table__actions {
    white-space: nowrap;
  }

  /* ---------- Mobile ---------- */
  .m-table__cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .m-table__card {
    padding: 1rem;
    border: 1px solid var(--mimosy-border);
    border-radius: var(--mimosy-radius-lg);
    background: var(--mimosy-raised);
  }

  .m-table__card.is-clickable {
    cursor: pointer;
    transition: border-color var(--mimosy-duration-fast) var(--mimosy-ease);
  }

  .m-table__card.is-clickable:active {
    border-color: var(--mimosy-green);
  }

  .m-table__card:focus-visible {
    outline: none;
    box-shadow: var(--mimosy-focus-ring);
  }

  .m-table__card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .m-table__card-primary {
    min-width: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .m-table__card-list {
    display: grid;
    gap: 0.5rem;
    margin: 0.85rem 0 0;
    padding-top: 0.85rem;
    border-top: 1px solid var(--mimosy-border);
  }

  .m-table__card-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.8125rem;
  }

  .m-table__card-row dt {
    flex-shrink: 0;
    color: var(--mimosy-text-soft);
  }

  .m-table__card-row dd {
    min-width: 0;
    margin: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .m-table__card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--mimosy-border);
  }
}
</style>
