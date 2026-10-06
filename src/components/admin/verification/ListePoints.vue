<!-- Liste d'observations avec icône et ton (cohérent, à vérifier, incohérence). -->
<script setup>
import { computed } from 'vue'
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-vue-next'

const props = defineProps({
  titre: { type: String, required: true },
  points: { type: Array, default: () => [] },
  ton: { type: String, default: 'warning', validator: (v) => ['success', 'warning', 'danger'].includes(v) },
})

const icone = computed(() => ({ success: CircleCheck, warning: TriangleAlert, danger: CircleX })[props.ton])
const couleur = computed(() => ({ success: 'text-success', warning: 'text-warning', danger: 'text-danger' })[props.ton])
</script>

<template>
  <div v-if="points?.length">
    <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" :class="couleur">{{ titre }}</p>
    <ul class="flex flex-col gap-1.5">
      <li v-for="point in points" :key="point" class="flex items-start gap-2 text-sm leading-5 text-ink">
        <component :is="icone" :size="15" :stroke-width="1.8" class="mt-0.5 shrink-0" :class="couleur" aria-hidden="true" />
        <span>{{ point }}</span>
      </li>
    </ul>
  </div>
</template>
