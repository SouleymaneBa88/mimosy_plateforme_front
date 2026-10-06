<!--
  Mini-courbe de tendance pour une carte KPI. Purement visuelle
  (aria-hidden) : la valeur et sa comparaison sont toujours écrites en
  texte à côté. Une série vide ou entièrement nulle n'affiche qu'une ligne
  de base, pour ne pas suggérer une tendance qui n'existe pas.
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  valeurs: { type: Array, default: () => [] },
  couleur: { type: String, default: 'var(--mimosy-green)' },
  hauteur: { type: Number, default: 36 },
})

const LARGEUR = 120

const points = computed(() => {
  const serie = props.valeurs.map((v) => Number(v) || 0)
  if (serie.length < 2) return []
  const max = Math.max(...serie)
  const min = Math.min(...serie, 0)
  const etendue = max - min || 1
  const marge = 3
  return serie.map((v, i) => [
    (i / (serie.length - 1)) * LARGEUR,
    marge + (1 - (v - min) / etendue) * (props.hauteur - marge * 2),
  ])
})

const plat = computed(() => !props.valeurs.some((v) => Number(v)))
const trait = computed(() => points.value.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '))
const aire = computed(() => (points.value.length ? `${trait.value} L${LARGEUR},${props.hauteur} L0,${props.hauteur} Z` : ''))
</script>

<template>
  <svg
    class="sparkline"
    :viewBox="`0 0 ${LARGEUR} ${hauteur}`"
    :height="hauteur"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <line v-if="plat || !points.length" x1="0" :y1="hauteur - 2" :x2="LARGEUR" :y2="hauteur - 2" stroke="var(--mimosy-border-strong)" stroke-width="1.5" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" />
    <template v-else>
      <path :d="aire" :fill="couleur" fill-opacity="0.08" />
      <path class="sparkline__trait" :d="trait" fill="none" :stroke="couleur" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1" />
    </template>
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  width: 100%;
  overflow: visible;
}

.sparkline__trait {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: trace 0.8s var(--mimosy-ease) 0.15s forwards;
}

@keyframes trace { to { stroke-dashoffset: 0; } }

@media (prefers-reduced-motion: reduce) {
  .sparkline__trait { animation: none; stroke-dashoffset: 0; }
}
</style>
