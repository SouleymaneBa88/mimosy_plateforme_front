<script setup>
/**
 * Panneau déroulant de la cloche : n'affiche que les notifications NON
 * LUES (voir consigne produit) — une fois cliquée, une notification est
 * marquée comme lue par le parent (ClientNavbar.vue) et disparaît donc
 * immédiatement de cette liste, puisqu'elle est filtrée sur `!lu` en amont.
 */
// Props : ouvert ou non, la liste des notifications, et l'état de chargement.
defineProps({ modelValue: Boolean, notifications: { type: Array, default: () => [] }, loading: Boolean })
// Événements : fermer le panneau, ou signaler qu'une notification a été cliquée ("read").
defineEmits(['update:modelValue', 'read'])
</script>

<template>
  <div v-if="modelValue" class="absolute right-0 top-12 z-30 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-mimosy-border bg-mimosy-surface p-4 shadow-lg">
    <!-- En-tête avec le titre et le bouton de fermeture. -->
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-sans font-bold text-mimosy-text">Notifications</h2>
      <button type="button" class="text-xl leading-none text-mimosy-secondary transition hover:text-mimosy-text" aria-label="Fermer" @click="$emit('update:modelValue', false)">×</button>
    </div>
    <!-- Trois cas : chargement, liste vide, ou liste des notifications. -->
    <div v-if="loading" class="py-6 text-center font-sans text-sm text-mimosy-secondary">Chargement...</div>
    <div v-else-if="!notifications.length" class="py-6 text-center font-sans text-sm text-mimosy-secondary">Aucune notification.</div>
    <button
      v-for="notification in notifications"
      v-else
      :key="notification.id"
      type="button"
      class="flex w-full gap-3 border-t border-mimosy-border px-1 py-3 text-left transition hover:bg-mimosy-page"
      @click="$emit('read', notification.id)"
    >
      <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-mimosy-primary" />
      <span class="min-w-0">
        <strong class="block truncate font-sans text-sm text-mimosy-text">{{ notification.titre }}</strong>
        <span class="block truncate font-sans text-xs text-mimosy-secondary">{{ notification.message }}</span>
        <span class="mt-1 block font-sans text-[11px] text-mimosy-secondary/80">{{ notification.date }}</span>
      </span>
    </button>
  </div>
</template>
