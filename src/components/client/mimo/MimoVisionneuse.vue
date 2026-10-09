<script setup>
/**
 * Photo en grand format, avec agrandissement. Fermeture : Échap, bouton, ou
 * clic à côté de l'image. Le focus va au bouton Fermer à l'ouverture et revient
 * à l'élément d'origine à la fermeture.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { X, ZoomIn, ZoomOut } from 'lucide-vue-next'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: 'Photo envoyée à Mimo' },
})
const emit = defineEmits(['fermer'])

const agrandie = ref(false)
const boutonFermer = ref(null)
let focusPrecedent = null

function surTouche(event) {
  if (event.key === 'Escape') emit('fermer')
}

onMounted(async () => {
  focusPrecedent = document.activeElement
  document.addEventListener('keydown', surTouche)
  await nextTick()
  boutonFermer.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', surTouche)
  focusPrecedent?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex flex-col bg-[#1c2420]/90"
      role="dialog"
      aria-modal="true"
      :aria-label="props.alt"
      data-testid="mimo-visionneuse"
      @click.self="emit('fermer')"
    >
      <div class="flex justify-end gap-2 p-3">
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          :aria-label="agrandie ? 'Réduire la photo' : 'Agrandir la photo'"
          :aria-pressed="agrandie"
          @click="agrandie = !agrandie"
        >
          <ZoomOut v-if="agrandie" :size="20" :stroke-width="2" />
          <ZoomIn v-else :size="20" :stroke-width="2" />
        </button>
        <button
          ref="boutonFermer"
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Fermer la photo"
          @click="emit('fermer')"
        >
          <X :size="20" :stroke-width="2" />
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-auto px-4 pb-6" :class="agrandie ? '' : 'flex items-center justify-center'" @click.self="emit('fermer')">
        <img
          :src="props.src"
          :alt="props.alt"
          class="mx-auto rounded-2xl"
          :class="agrandie ? 'max-w-none w-[200%] sm:w-[160%] cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'"
          @click="agrandie = !agrandie"
        />
      </div>
    </div>
  </Teleport>
</template>
