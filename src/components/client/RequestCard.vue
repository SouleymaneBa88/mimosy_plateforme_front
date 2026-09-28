<script setup>
/**
 * Carte de demande — mêmes règles visuelles que les autres cartes CLIENT
 * (radius, bordure, hiérarchie d'actions) : action primaire = bouton
 * plein mimosy-primary, action secondaire = bouton contour.
 */
defineProps({
  icon: {
    // Emoji simple, comme dans la maquette
    type: String,
    required: true,
  },
  iconBackground: {
    type: String,
    default: 'var(--color-mimosy-page)',
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
    default: 'var(--color-mimosy-primaryBg)',
  },

  statusColor: {
    type: String,
    default: 'var(--color-mimosy-primary)',
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
  <article class="flex flex-col gap-5 rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6" :class="muted ? 'opacity-90' : ''">
    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl sm:h-16 sm:w-16 sm:text-[30px]" :style="{ backgroundColor: iconBackground }">{{ icon }}</div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <h3 class="font-sans text-[16px] font-bold leading-6 text-mimosy-text sm:text-[17px] sm:leading-[25.5px]">{{ title }}</h3>
        <span class="shrink-0 rounded-full px-3 py-1 font-sans text-xs font-bold" :style="{ backgroundColor: statusBackground, color: statusColor }">{{ statusLabel }}</span>
      </div>

      <p class="mt-1 font-sans text-[13px] leading-[19.5px] text-mimosy-secondary">{{ meta }}</p>

      <div class="mt-2"><slot /></div>
    </div>

    <div class="flex gap-2 sm:min-w-[140px] sm:flex-col">
      <button type="button" class="flex-1 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 sm:flex-none" @click="emit('primary-action')">
        {{ primaryLabel }}
      </button>
      <button type="button" class="flex-1 rounded-xl border border-mimosy-border bg-mimosy-surface px-4 py-2.5 font-sans text-sm font-medium text-mimosy-text transition hover:border-mimosy-primary hover:text-mimosy-primary sm:flex-none" @click="emit('secondary-action')">
        {{ secondaryLabel }}
      </button>
    </div>
  </article>
</template>
