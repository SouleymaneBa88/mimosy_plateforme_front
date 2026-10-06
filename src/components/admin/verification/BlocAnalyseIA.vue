<!--
  Encadré d'une analyse automatique (IA ou règles). Toujours présenté comme
  une AIDE : l'en-tête indique qui l'a produite et le pied rappelle que la
  décision revient à l'administrateur. Visuellement distinct (teinte
  « info ») du bloc de décision humaine (teinte de marque).
-->
<script setup>
import { computed } from 'vue'
import { Bot, Info } from 'lucide-vue-next'

const props = defineProps({
  titre: { type: String, required: true },
  // « claude », « gemini »… = IA ; « regles » = contrôle automatique sans IA.
  mode: { type: String, default: '' },
  agent: { type: String, default: '' },
  date: { type: String, default: '' },
  avertissement: { type: String, default: "Aide à la décision : l'IA ne valide ni ne rejette rien. La décision finale revient à l'administrateur." },
})

const parIA = computed(() => props.mode && props.mode !== 'regles')
const auteur = computed(() => {
  if (props.agent) return `${props.agent} (IA)`
  return parIA.value ? 'IA MIMOSY' : 'Contrôle automatique (sans IA)'
})
</script>

<template>
  <div class="bloc-ia">
    <div class="bloc-ia__entete">
      <span class="bloc-ia__icone" aria-hidden="true"><Bot :size="15" :stroke-width="1.8" /></span>
      <div class="min-w-[10rem] flex-1">
        <p class="bloc-ia__titre">{{ titre }}</p>
        <p class="bloc-ia__meta">
          {{ auteur }}<template v-if="date"> · {{ date }}</template>
        </p>
      </div>
      <slot name="badge" />
    </div>
    <div class="bloc-ia__corps"><slot /></div>
    <p class="bloc-ia__pied">
      <Info :size="13" :stroke-width="1.8" aria-hidden="true" />
      {{ avertissement }}
    </p>
  </div>
</template>

<style scoped>
.bloc-ia {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  border: 1px solid #d5e3e5;
  border-left: 3px solid var(--mimosy-info);
  border-radius: var(--mimosy-radius-md);
  background: var(--mimosy-info-soft);
}

.bloc-ia__entete {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.625rem;
}

.bloc-ia__icone {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  background: #fff;
  color: var(--mimosy-info);
}

.bloc-ia__titre {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--mimosy-text);
}

.bloc-ia__meta {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--mimosy-text-soft);
}

.bloc-ia__corps {
  font-size: 0.875rem;
  line-height: 1.375rem;
  color: var(--mimosy-text);
}

.bloc-ia__pied {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0;
  padding-top: 0.625rem;
  border-top: 1px solid #d5e3e5;
  font-size: 0.75rem;
  line-height: 1.125rem;
  color: var(--mimosy-info);
}

.bloc-ia__pied svg {
  flex-shrink: 0;
  margin-top: 0.125rem;
}
</style>
