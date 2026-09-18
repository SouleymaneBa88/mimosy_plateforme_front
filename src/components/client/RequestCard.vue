<script setup>
defineProps({
  icon: {
    // Emoji simple, comme dans la maquette (🔧, ⚡, ✨...)
    type: String,
    required: true,
  },

  iconBackground: {
    type: String,
    default: '#FAF5F0',
  },

  title: {
    type: String,
    required: true,
  },

  statusLabel: {
    type: String,
    required: true,
  },

  // Couleurs du badge de statut, définies par la vue parente selon l'état de la demande
  statusBackground: {
    type: String,
    default: '#EAF8F2',
  },

  statusColor: {
    type: String,
    default: '#16805B',
  },

  meta: {
    type: String,
    required: true,
  },

  primaryLabel: {
    type: String,
    required: true,
  },

  secondaryLabel: {
    type: String,
    required: true,
  },

  // Légèrement estompée pour les demandes terminées/archivées, comme dans la maquette
  muted: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['primary-action', 'secondary-action'])
</script>

<template>
  <article
    class="flex flex-col gap-5 rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6 sm:p-6"
    :class="muted ? 'opacity-90' : ''"
  >
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl sm:h-16 sm:w-16 sm:text-[30px]"
      :style="{ backgroundColor: iconBackground }"
    >
      {{ icon }}
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <h3 class="text-[16px] font-bold leading-6 text-[#0F172A] sm:text-[17px] sm:leading-[25.5px]">
          {{ title }}
        </h3>

        <span
          class="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
          :style="{ backgroundColor: statusBackground, color: statusColor }"
        >
          {{ statusLabel }}
        </span>
      </div>

      <p class="mt-1 text-[13px] leading-[19.5px] text-[#64748B]">
        {{ meta }}
      </p>

      <!-- Contenu spécifique à l'état de la demande : barre de progression, prix du devis, montant payé... -->
      <div class="mt-2">
        <slot />
      </div>
    </div>

    <div class="flex gap-2 sm:min-w-[140px] sm:flex-col">
      <button
        type="button"
        class="flex-1 rounded-full bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1D4033] sm:flex-none"
        @click="emit('primary-action')"
      >
        {{ primaryLabel }}
      </button>

      <button
        type="button"
        class="flex-1 rounded-full border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#FAF5F0] sm:flex-none"
        @click="emit('secondary-action')"
      >
        {{ secondaryLabel }}
      </button>
    </div>
  </article>
</template>