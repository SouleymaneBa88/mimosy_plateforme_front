<script setup>
defineProps({ modelValue: Boolean, notifications: { type: Array, default: () => [] }, loading: Boolean })
defineEmits(['update:modelValue', 'read'])
</script>

<template>
  <div v-if="modelValue" class="absolute right-0 top-12 z-30 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-lg">
    <div class="mb-3 flex items-center justify-between"><h2 class="font-bold text-[#051F20]">Notifications</h2><button type="button" class="text-xl text-[#64748B]" aria-label="Fermer" @click="$emit('update:modelValue', false)">×</button></div>
    <div v-if="loading" class="py-6 text-center text-sm text-[#64748B]">Chargement...</div>
    <div v-else-if="!notifications.length" class="py-6 text-center text-sm text-[#64748B]">Aucune notification.</div>
    <button v-for="notification in notifications" v-else :key="notification.id" type="button" class="flex w-full gap-3 border-t border-[#F1F5F9] px-1 py-3 text-left" :class="notification.lue ? 'opacity-60' : ''" @click="$emit('read', notification.id)">
      <span class="mt-1 h-2 w-2 shrink-0 rounded-full" :class="notification.lue ? 'bg-[#CBD5E1]' : 'bg-[#2F6250]'" />
      <span><strong class="block text-sm text-[#051F20]">{{ notification.titre }}</strong><span class="block text-xs text-[#64748B]">{{ notification.description }}</span><span class="mt-1 block text-[11px] text-[#94A3B8]">{{ notification.heure }}</span></span>
    </button>
  </div>
</template>
