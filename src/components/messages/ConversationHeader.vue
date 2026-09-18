<script setup>
defineProps({ conversation: { type: Object, required: true } })
</script>
<template>
  <header class="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 sm:px-8"><div class="flex items-center gap-3"><img :src="conversation.avatar" :alt="conversation.nom" class="h-10 w-10 rounded-full object-cover" /><div><p class="font-bold text-[#334155]">{{ conversation.nom }}</p><p class="text-xs text-[#64748B]">{{ conversation.enLigne ? 'En ligne' : 'Hors ligne' }} · {{ conversation.service }}</p></div></div><button type="button" class="h-9 w-9 rounded-full border border-[#E2E8F0] text-[#64748B]" aria-label="Options">⋮</button></header>
</template>
