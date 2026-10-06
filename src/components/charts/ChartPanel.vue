<!--
  Carte de graphique : titre, phrase d'explication (ce que l'on mesure),
  le graphique lui-même, un état vide honnête quand il n'y a encore aucune
  donnée, et une vue « tableau » des mêmes chiffres (accessibilité :
  l'information ne dépend jamais de la seule couleur).
-->
<script setup>
import { ref } from 'vue'
import { ChartNoAxesColumn, Table2 } from 'lucide-vue-next'

defineProps({
  titre: { type: String, required: true },
  description: { type: String, default: '' },
  vide: { type: Boolean, default: false },
  messageVide: { type: String, default: 'Aucune donnée sur la période pour le moment.' },
  hauteur: { type: Number, default: 240 },
  // { colonnes: ['Mois', 'Demandes'], lignes: [['oct. 26', 3], …] }
  tableau: { type: Object, default: null },
  // Total de la période affichée, ex. chiffre="24" chiffreLibelle="demandes sur 12 mois".
  chiffre: { type: [String, Number], default: null },
  chiffreLibelle: { type: String, default: '' },
  ordre: { type: Number, default: 0 },
})

const vueTableau = ref(false)
</script>

<template>
  <section class="panneau" :style="{ '--reveal-delay': `${ordre * 60}ms` }">
    <header class="panneau__entete">
      <div class="min-w-0">
        <h2 class="panneau__titre">{{ titre }}</h2>
        <p v-if="description" class="panneau__description">{{ description }}</p>
        <p v-if="chiffre !== null && !vide" class="panneau__chiffre">
          <span class="tabular">{{ chiffre }}</span> {{ chiffreLibelle }}
        </p>
      </div>
      <div class="panneau__actions">
        <slot name="actions" />
        <button
          v-if="tableau && !vide"
          type="button"
          class="panneau__bascule"
          :aria-pressed="vueTableau"
          :title="vueTableau ? 'Afficher le graphique' : 'Afficher les données en tableau'"
          @click="vueTableau = !vueTableau"
        >
          <component :is="vueTableau ? ChartNoAxesColumn : Table2" :size="15" :stroke-width="1.8" aria-hidden="true" />
          <span class="sr-only">{{ vueTableau ? 'Afficher le graphique' : 'Afficher les données en tableau' }}</span>
        </button>
      </div>
    </header>

    <div v-if="vide" class="panneau__vide" :style="{ minHeight: `${hauteur}px` }">
      <ChartNoAxesColumn :size="22" :stroke-width="1.5" aria-hidden="true" />
      <p>{{ messageVide }}</p>
    </div>

    <div v-else-if="vueTableau && tableau" class="panneau__tableau" :style="{ maxHeight: `${hauteur + 40}px` }">
      <table>
        <thead>
          <tr><th v-for="colonne in tableau.colonnes" :key="colonne" scope="col">{{ colonne }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(ligne, index) in tableau.lignes" :key="index">
            <td v-for="(cellule, j) in ligne" :key="j">{{ cellule }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="panneau__graphique" :style="{ height: `${hauteur}px` }">
      <slot />
    </div>

    <footer v-if="$slots.pied" class="panneau__pied"><slot name="pied" /></footer>
  </section>
</template>

<style scoped>
.panneau {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
  padding: 1.5rem;
  border: 1px solid var(--mimosy-border);
  border-radius: var(--mimosy-radius-lg);
  background: var(--mimosy-surface);
  animation: apparition 0.35s var(--mimosy-ease) both;
  animation-delay: var(--reveal-delay, 0ms);
}

.panneau__chiffre {
  margin: 0.625rem 0 0;
  font-size: 0.8125rem;
  color: var(--mimosy-text-soft);
}

.panneau__chiffre span {
  margin-right: 0.125rem;
  font-family: var(--mimosy-font-serif);
  font-size: 1.75rem;
  line-height: 2rem;
  color: var(--mimosy-text);
}

.panneau__entete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.panneau__titre {
  margin: 0;
  font-family: var(--mimosy-font-serif);
  font-size: 1.375rem;
  font-weight: 400;
  line-height: 1.75rem;
  color: var(--mimosy-text);
}

.panneau__description {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: var(--mimosy-muted);
}

.panneau__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.panneau__bascule {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--mimosy-border);
  border-radius: var(--mimosy-radius-sm);
  background: var(--mimosy-raised);
  color: var(--mimosy-text-soft);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.panneau__bascule:hover,
.panneau__bascule[aria-pressed='true'] {
  border-color: var(--mimosy-green);
  color: var(--mimosy-green);
}

.panneau__graphique {
  position: relative;
  min-width: 0;
}

.panneau__vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px dashed var(--mimosy-border-strong);
  border-radius: var(--mimosy-radius-md);
  color: var(--mimosy-muted);
  text-align: center;
}

.panneau__vide p {
  max-width: 22rem;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--mimosy-text-soft);
}

.panneau__tableau {
  overflow: auto;
  border: 1px solid var(--mimosy-border);
  border-radius: var(--mimosy-radius-md);
}

.panneau__tableau table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.panneau__tableau th,
.panneau__tableau td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--mimosy-border);
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.panneau__tableau th:first-child,
.panneau__tableau td:first-child {
  text-align: left;
}

.panneau__tableau th {
  position: sticky;
  top: 0;
  background: var(--mimosy-sunken);
  font-weight: 600;
  color: var(--mimosy-text-soft);
}

.panneau__pied {
  padding-top: 1rem;
  border-top: 1px solid var(--mimosy-border);
}

@keyframes apparition {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 640px) {
  .panneau { padding: 1.125rem; }
}

@media (prefers-reduced-motion: reduce) {
  .panneau { animation: none; }
}
</style>
