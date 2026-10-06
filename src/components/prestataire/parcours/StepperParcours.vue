<!--
  Progression du parcours « Vérifier mon profil professionnel ».
  Profil → Identité → Compétences → Cohérence → Entretien → Validation.
  Les étapes terminées peuvent être rouvertes (pour corriger) ; les étapes
  futures ne sont pas cliquables : le backend décide de l'ordre.
-->
<script setup>
import { Check, Circle, CircleDot } from 'lucide-vue-next'

defineProps({
  etapes: { type: Array, required: true },
  etapeAffichee: { type: String, default: '' },
})
const emit = defineEmits(['choisir'])

const ROUVRABLES = ['profil', 'identite', 'competences', 'coherence']
</script>

<template>
  <nav aria-label="Progression du parcours" class="border border-[#E5E7E2] bg-white p-4 sm:p-5">
    <ol class="grid grid-cols-3 gap-3 sm:grid-cols-6">
      <li v-for="etape in etapes" :key="etape.cle">
        <button
          type="button"
          class="flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition disabled:cursor-default"
          :class="etape.cle === etapeAffichee ? 'bg-[#F1F5F1]' : 'hover:bg-[#FAFAF8]'"
          :disabled="etape.etat === 'a_faire' || (etape.etat === 'termine' && !ROUVRABLES.includes(etape.cle))"
          :aria-current="etape.etat === 'en_cours' ? 'step' : undefined"
          :data-test="`etape-${etape.cle}`"
          @click="emit('choisir', etape.cle)"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full border"
            :class="{
              'border-[#2D6A4F] bg-[#2D6A4F] text-white': etape.etat === 'termine',
              'border-[#2D6A4F] bg-white text-[#2D6A4F]': etape.etat === 'en_cours',
              'border-[#D3D7D0] bg-white text-[#7A847E]': etape.etat === 'a_faire',
            }"
          >
            <Check v-if="etape.etat === 'termine'" class="h-4 w-4" aria-hidden="true" />
            <CircleDot v-else-if="etape.etat === 'en_cours'" class="h-4 w-4" aria-hidden="true" />
            <Circle v-else class="h-4 w-4" aria-hidden="true" />
          </span>
          <span
            class="text-xs font-semibold"
            :class="etape.etat === 'a_faire' ? 'text-[#7A847E]' : 'text-[#1C2420]'"
          >
            {{ etape.libelle }}
          </span>
          <span class="sr-only">
            {{ etape.etat === 'termine' ? 'terminée' : etape.etat === 'en_cours' ? 'en cours' : 'à faire' }}
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
