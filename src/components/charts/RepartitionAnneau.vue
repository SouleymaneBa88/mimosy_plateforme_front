<!--
  Répartition d'un total en quelques parts (6 au maximum) : un anneau et,
  à côté, la liste des parts avec leur nombre et leur pourcentage. Le total
  est affiché au centre. La légende chiffrée porte l'information : la
  couleur n'est jamais le seul repère.
-->
<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'

import { formaterNombre, optionsAnneau, serieAnneau } from './chartTheme'

const props = defineProps({
  // [{ libelle, valeur, couleur, to? }]
  parts: { type: Array, required: true },
  libelleTotal: { type: String, default: 'au total' },
})

const total = computed(() => props.parts.reduce((somme, part) => somme + (part.valeur || 0), 0))
const partsVisibles = computed(() => props.parts.filter((part) => part.valeur > 0))

const donnees = computed(() => ({
  labels: partsVisibles.value.map((part) => part.libelle),
  datasets: [serieAnneau(partsVisibles.value.map((part) => part.valeur), partsVisibles.value.map((part) => part.couleur))],
}))
const options = optionsAnneau()

function pourcentage(valeur) {
  return total.value ? `${Math.round((valeur / total.value) * 100)} %` : '0 %'
}
</script>

<template>
  <div class="repartition">
    <div class="repartition__anneau">
      <Doughnut :data="donnees" :options="options" aria-hidden="true" />
      <div class="repartition__centre">
        <span class="repartition__total tabular">{{ formaterNombre(total) }}</span>
        <span class="repartition__libelle">{{ libelleTotal }}</span>
      </div>
    </div>

    <ul class="repartition__legende">
      <li v-for="part in parts" :key="part.libelle">
        <component
          :is="part.to ? 'router-link' : 'div'"
          :to="part.to"
          class="repartition__ligne"
          :class="{ 'repartition__ligne--lien': part.to }"
        >
          <span class="repartition__pastille" :style="{ background: part.couleur }" aria-hidden="true" />
          <span class="repartition__nom">{{ part.libelle }}</span>
          <span class="repartition__valeur tabular">{{ formaterNombre(part.valeur) }}</span>
          <span class="repartition__part tabular">{{ pourcentage(part.valeur) }}</span>
        </component>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.repartition {
  display: grid;
  grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
  align-items: center;
  gap: 1.5rem;
  height: 100%;
}

.repartition__anneau {
  position: relative;
  height: 180px;
}

.repartition__centre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.repartition__total {
  font-family: var(--mimosy-font-serif);
  font-size: 2rem;
  line-height: 2.25rem;
  color: var(--mimosy-text);
}

.repartition__libelle {
  font-size: 0.75rem;
  color: var(--mimosy-muted);
}

.repartition__legende {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.repartition__ligne {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto 3rem;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--mimosy-radius-sm);
  color: var(--mimosy-text);
  font-size: 0.875rem;
  text-decoration: none;
}

.repartition__ligne--lien {
  transition: background 0.2s;
}

.repartition__ligne--lien:hover {
  background: var(--mimosy-green-mist);
}

.repartition__pastille {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.repartition__nom {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repartition__valeur {
  font-weight: 600;
}

.repartition__part {
  font-size: 0.75rem;
  color: var(--mimosy-muted);
  text-align: right;
}

@media (max-width: 520px) {
  .repartition {
    grid-template-columns: 1fr;
  }
  .repartition__anneau {
    height: 160px;
  }
}
</style>
