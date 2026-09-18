<script setup>
defineProps({ conversation: { type: Object, required: true }, active: Boolean })
defineEmits(['select'])
</script>
<template>
  <button type="button" class="flex w-full items-center gap-3 border-b border-[#F1F5F9] p-4 text-left" :class="active ? 'border-l-4 border-l-[#2F6250] bg-[#FFF3ED]' : 'border-l-4 border-l-transparent hover:bg-[#FAFAFA]'" @click="$emit('select', conversation.id)">
    <div class="relative shrink-0"><img :src="conversation.avatar" :alt="conversation.nom" class="h-12 w-12 rounded-full object-cover" /><span v-if="conversation.enLigne" class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2F6250]" /></div>
    <div class="min-w-0 flex-1"><div class="flex justify-between gap-2"><strong class="truncate text-sm text-[#334155]">{{ conversation.nom }}</strong><span class="text-[11px] text-[#64748B]">{{ conversation.heure }}</span></div><p class="truncate text-xs" :class="conversation.nonLu ? 'font-bold text-[#334155]' : 'text-[#64748B]'">{{ conversation.dernierMessage }}</p></div>
  </button>
</template>
