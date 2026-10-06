<!--
  Carte d'indicateur clé.

  - valeur principale très lisible, libellé clair ;
  - évolution UNIQUEMENT si le serveur fournit deux périodes comparables
    (`evolution` = { actuel, precedent }) : jamais estimée ;
  - ton positif / négatif / neutre selon le sens souhaitable
    (`baisseFavorable` pour les litiges, par exemple) ;
  - mini-courbe de la période si une série mensuelle est fournie ;
  - toute la carte mène à la page détaillée si `to` est fourni.
-->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-vue-next'

import Sparkline from './Sparkline.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: null },
  icon: { type: [Object, Function], default: null },
  hint: { type: String, default: '' },
  // { actuel, precedent } issus de l'API ; `formater` met en forme l'écart absolu.
  evolution: { type: Object, default: null },
  jours: { type: Number, default: 30 },
  formater: { type: Function, default: (n) => new Intl.NumberFormat('fr-FR').format(n) },
  baisseFavorable: { type: Boolean, default: false },
  serie: { type: Array, default: null },
  to: { type: [String, Object], default: null },
  loading: { type: Boolean, default: false },
  // Variante mise en avant (fond vert) : à réserver à un seul indicateur.
  accent: { type: Boolean, default: false },
})

const valeur = computed(() => (props.value === null || props.value === undefined || props.value === '' ? '—' : props.value))

const tendance = computed(() => {
  const e = props.evolution
  if (!e) return null
  const actuel = Number(e.actuel) || 0
  const precedent = Number(e.precedent) || 0
  const ecart = actuel - precedent
  const periode = `${props.jours} derniers jours`
  if (!actuel && !precedent) return { ton: 'neutre', icone: Minus, texte: `Aucune activité sur les ${periode}` }
  if (!ecart) return { ton: 'neutre', icone: Minus, texte: `Stable sur les ${periode}` }

  const hausse = ecart > 0
  const favorable = props.baisseFavorable ? !hausse : hausse
  // Pas de pourcentage depuis zéro (ce serait « +∞ % ») : on donne l'écart réel.
  const variation = precedent
    ? `${hausse ? '+' : '−'}${Math.round((Math.abs(ecart) / precedent) * 100)} %`
    : `+${props.formater(Math.abs(ecart))}`
  return {
    ton: favorable ? 'positif' : 'negatif',
    icone: hausse ? TrendingUp : TrendingDown,
    variation,
    texte: `${props.formater(actuel)} sur ${props.jours} j · ${props.formater(precedent)} avant`,
  }
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="kpi group"
    :class="{ 'kpi--lien': to, 'kpi--accent': accent }"
    :aria-busy="loading || undefined"
  >
    <div class="kpi__entete">
      <span v-if="icon" class="kpi__icone" aria-hidden="true"><component :is="icon" :size="16" :stroke-width="1.8" /></span>
      <span class="kpi__libelle">{{ label }}</span>
      <ArrowRight v-if="to" :size="15" class="kpi__fleche" aria-hidden="true" />
    </div>

    <template v-if="loading">
      <span class="kpi__squelette kpi__squelette--valeur" aria-hidden="true" />
      <span class="kpi__squelette" aria-hidden="true" />
      <span class="sr-only">Chargement de {{ label }}</span>
    </template>

    <template v-else>
      <span class="kpi__valeur tabular">{{ valeur }}</span>

      <div v-if="tendance" class="kpi__tendance" :title="`Comparaison des ${jours} derniers jours avec les ${jours} jours précédents`">
        <span v-if="tendance.variation" class="kpi__pastille" :class="`kpi__pastille--${tendance.ton}`">
          <component :is="tendance.icone" :size="13" :stroke-width="2.2" aria-hidden="true" />
          {{ tendance.variation }}
        </span>
        <component :is="tendance.icone" v-else :size="13" class="kpi__neutre" aria-hidden="true" />
        <span class="kpi__comparaison">{{ tendance.texte }}</span>
      </div>
      <p v-if="hint" class="kpi__indice">{{ hint }}</p>

      <Sparkline v-if="serie?.length > 1" class="kpi__courbe" :valeurs="serie" :couleur="accent ? '#E2EAE4' : 'var(--mimosy-green)'" />
    </template>
  </component>
</template>

<style scoped>
.kpi {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  padding: 1.125rem 1.25rem 1.125rem;
  border: 1px solid var(--mimosy-border);
  border-radius: var(--mimosy-radius-lg);
  background: var(--mimosy-surface);
  color: var(--mimosy-text);
  text-decoration: none;
  transition: border-color 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
}

.kpi--lien:hover {
  border-color: var(--mimosy-border-strong);
  background: var(--mimosy-raised);
  transform: translateY(-1px);
}

.kpi--lien:focus-visible {
  outline: 2px solid var(--mimosy-green);
  outline-offset: 2px;
}

.kpi__entete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.kpi__icone {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 0.5rem;
  background: var(--mimosy-green-soft);
  color: var(--mimosy-green);
}

.kpi__libelle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mimosy-text-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi__fleche {
  flex-shrink: 0;
  color: var(--mimosy-muted);
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.kpi--lien:hover .kpi__fleche,
.kpi--lien:focus-visible .kpi__fleche {
  opacity: 1;
  transform: none;
}

.kpi__valeur {
  margin-top: 0.25rem;
  font-family: var(--mimosy-font-serif);
  font-size: 2.25rem;
  line-height: 2.5rem;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.kpi__tendance {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
}

.kpi__pastille {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.kpi__pastille--positif { background: var(--mimosy-success-soft); color: var(--mimosy-success); }
.kpi__pastille--negatif { background: var(--mimosy-danger-soft); color: var(--mimosy-danger); }
.kpi__neutre { flex-shrink: 0; color: var(--mimosy-muted); }

.kpi__comparaison {
  flex: 1 1 9rem;
  min-width: 0;
}

.kpi__comparaison,
.kpi__indice {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.125rem;
  color: var(--mimosy-muted);
}

.kpi__courbe {
  margin-top: auto;
  padding-top: 0.5rem;
}

.kpi__squelette {
  display: block;
  width: 60%;
  height: 0.75rem;
  border-radius: 999px;
  background: var(--mimosy-sunken);
  animation: mimosy-skeleton 1.4s ease-in-out infinite;
}

.kpi__squelette--valeur {
  width: 45%;
  height: 2.25rem;
  margin-top: 0.25rem;
  border-radius: 0.5rem;
}

/* Variante mise en avant : vert MIMOSY plein. */
.kpi--accent {
  border-color: var(--mimosy-green);
  background: var(--mimosy-green);
  color: #fff;
}

.kpi--accent.kpi--lien:hover {
  border-color: #24563f;
  background: #24563f;
}

.kpi--accent .kpi__icone { background: rgba(255, 255, 255, 0.14); color: #fff; }
.kpi--accent .kpi__libelle { color: rgba(255, 255, 255, 0.82); }
.kpi--accent .kpi__fleche,
.kpi--accent .kpi__comparaison,
.kpi--accent .kpi__neutre,
.kpi--accent .kpi__indice { color: rgba(255, 255, 255, 0.72); }
.kpi--accent .kpi__pastille { background: rgba(255, 255, 255, 0.16); color: #fff; }

/* Petit écran : cartes compactes, deux par ligne. */
@media (max-width: 639px) {
  .kpi { gap: 0.375rem; padding: 0.875rem; }
  .kpi__icone { width: 1.5rem; height: 1.5rem; }
  .kpi__icone :deep(svg) { width: 13px; height: 13px; }
  .kpi__libelle { font-size: 0.75rem; white-space: normal; }
  .kpi__valeur { font-size: 1.75rem; line-height: 2rem; }
  .kpi__comparaison, .kpi__indice { font-size: 0.6875rem; line-height: 1rem; }
  .kpi__comparaison { flex-basis: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .kpi, .kpi__fleche { transition: none; }
  .kpi--lien:hover { transform: none; }
  .kpi__squelette { animation: none; }
}
</style>
