<script setup>
defineProps({
  prestataire: {
    type: Object,
    required: true,
  },

  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'view-profile'])
</script>

<template>
  <article
    class="cursor-pointer rounded-2xl border bg-white p-4 transition sm:p-5"
    :class="selected ? 'border-[#2F6250] ring-2 ring-[#2F6250]/10' : 'border-[#E2E8F0] hover:border-[#2F6250]/60'"
    @click="emit('select', prestataire.id)"
  >
    <div class="flex items-start gap-3 sm:gap-4">
      <div v-if="prestataire.image" class="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EAF8F2] sm:h-16 sm:w-16">
        <img :src="prestataire.image" :alt="`Photo de ${prestataire.nom}`" class="h-full w-full object-cover" />
      </div>
      <div v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EAF8F2] text-lg font-extrabold text-[#2F6250] sm:h-16 sm:w-16">
        {{ prestataire.nom?.charAt(0) || '?' }}
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <!-- .stop empêche le clic de déclencher aussi la sélection de la carte -->
            <button
              type="button"
              class="truncate text-left text-[15px] font-bold leading-5 text-[#051F20] hover:underline sm:text-base"
              @click.stop="emit('view-profile', prestataire)"
            >
              {{ prestataire.nom }}
            </button>
            <p class="mt-0.5 truncate text-[12px] text-[#64748B] sm:text-[13px]">
              {{ prestataire.entreprise ? `${prestataire.service} · ${prestataire.entreprise}` : prestataire.service }}
            </p>
          </div>

          <span v-if="prestataire.verifie" class="shrink-0 rounded-full bg-[#EAF8F2] px-2 py-1 text-[9px] font-bold text-[#16805B] sm:text-[10px]">
            Vérifié
          </span>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:mt-3">
          <span v-if="prestataire.note != null" class="flex items-center gap-1 font-bold text-[#334155]">★ {{ prestataire.note }}</span>
          <span v-if="prestataire.avis != null" class="text-[#64748B]">({{ prestataire.avis }} avis)</span>
          <span v-if="prestataire.zone" class="text-[#64748B]">{{ prestataire.zone }}<span v-if="prestataire.distance != null"> · {{ prestataire.distance }} km</span></span>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-3 border-t border-[#F1F5F9] pt-3 sm:pt-4">
      <span
        class="rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-[11px]"
        :class="prestataire.disponible ? 'bg-[#EAF8F2] text-[#16805B]' : 'bg-[#F1F5F9] text-[#64748B]'"
      >
        {{ prestataire.disponible ? 'Disponible' : 'Indisponible' }}
      </span>

      <p v-if="prestataire.prix != null" class="text-[15px] font-extrabold text-[#051F20] sm:text-base">
        {{ prestataire.prix.toLocaleString('fr-FR') }} FCFA
      </p>
    </div>
  </article>
</template>