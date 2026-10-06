<!--
  Activité récente sous forme de fil chronologique, regroupé par jour
  (« Aujourd'hui », « Hier », date). Chaque type d'événement a son icône,
  son ton et sa catégorie (filtres). Les événements viennent tels quels de
  l'API : rien n'est déduit ni complété.

  `types` : { TYPE: { libelle, icone, ton, categorie, lien?(item) } }
  `categories` : [{ value, label }] pour les filtres (facultatif).
-->
<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Activity, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  items: { type: Array, default: () => [] },
  types: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  limite: { type: Number, default: 8 },
  messageVide: { type: String, default: 'Aucune activité récente.' },
})

const filtre = ref('')
const deplie = ref(false)

const TONS = {
  brand: 'bg-brand-soft text-brand',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-sunken text-ink-soft',
}

const filtres = computed(() => {
  const presentes = new Set(props.items.map((item) => props.types[item.type]?.categorie).filter(Boolean))
  return props.categories.filter((c) => presentes.has(c.value))
})

const itemsFiltres = computed(() =>
  filtre.value ? props.items.filter((item) => props.types[item.type]?.categorie === filtre.value) : props.items,
)
const visibles = computed(() => (deplie.value ? itemsFiltres.value : itemsFiltres.value.slice(0, props.limite)))

function cleJour(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function libelleJour(date) {
  const d = new Date(date)
  const aujourdhui = new Date()
  const hier = new Date()
  hier.setDate(hier.getDate() - 1)
  if (cleJour(d) === cleJour(aujourdhui)) return "Aujourd'hui"
  if (cleJour(d) === cleJour(hier)) return 'Hier'
  const texte = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

const groupes = computed(() => {
  const resultat = []
  for (const item of visibles.value) {
    const cle = cleJour(item.date)
    let groupe = resultat[resultat.length - 1]
    if (!groupe || groupe.cle !== cle) {
      groupe = { cle, libelle: libelleJour(item.date), items: [] }
      resultat.push(groupe)
    }
    groupe.items.push(item)
  }
  return resultat
})

function heure(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function config(item) {
  return props.types[item.type] || { libelle: 'Activité', icone: Activity, ton: 'neutral' }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="filtres.length > 1" class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer l'activité">
      <button
        v-for="option in [{ value: '', label: 'Tout' }, ...filtres]"
        :key="option.value"
        type="button"
        class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="filtre === option.value ? 'border-brand bg-brand text-white' : 'border-line bg-raised text-ink-soft hover:border-line-strong'"
        :aria-pressed="filtre === option.value"
        @click="filtre = option.value; deplie = false"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="!visibles.length" class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-10 text-center">
      <Activity :size="20" class="text-muted" aria-hidden="true" />
      <p class="text-sm text-ink-soft">{{ messageVide }}</p>
    </div>

    <div v-else class="flex flex-col gap-4">
      <section v-for="groupe in groupes" :key="groupe.cle">
        <h3 class="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{{ groupe.libelle }}</h3>
        <ol class="relative">
          <li v-for="(item, index) in groupe.items" :key="`${item.type}-${item.date}-${index}`" class="activite relative">
            <span v-if="index < groupe.items.length - 1" class="absolute top-10 bottom-0 left-[17px] w-px bg-line" aria-hidden="true" />
            <component
              :is="config(item).lien?.(item) ? RouterLink : 'div'"
              :to="config(item).lien?.(item)"
              class="group flex items-start gap-3 rounded-xl px-1 py-2 transition-colors"
              :class="{ 'hover:bg-brand-mist': config(item).lien?.(item) }"
            >
              <span class="relative z-[1] flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ring-4 ring-surface" :class="TONS[config(item).ton] || TONS.neutral" aria-hidden="true">
                <component :is="config(item).icone" :size="15" :stroke-width="1.9" />
              </span>
              <span class="min-w-0 flex-1 pt-0.5">
                <span class="flex items-baseline justify-between gap-3">
                  <span class="truncate text-sm font-semibold text-ink">{{ config(item).libelle }}</span>
                  <time class="tabular shrink-0 text-xs text-muted" :datetime="item.date">{{ heure(item.date) }}</time>
                </span>
                <span class="block truncate text-sm text-ink-soft">{{ item.message }}</span>
              </span>
              <ChevronRight v-if="config(item).lien?.(item)" :size="15" class="mt-2.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </component>
          </li>
        </ol>
      </section>
    </div>

    <button
      v-if="itemsFiltres.length > limite"
      type="button"
      class="cursor-pointer self-start text-sm font-semibold text-brand hover:underline"
      :aria-expanded="deplie"
      @click="deplie = !deplie"
    >
      {{ deplie ? 'Afficher moins' : `Afficher tout (${itemsFiltres.length})` }}
    </button>
  </div>
</template>

<style scoped>
.activite {
  animation: mimosy-rise 0.3s var(--mimosy-ease-out, ease-out) both;
}

@media (prefers-reduced-motion: reduce) {
  .activite { animation: none; }
}
</style>
