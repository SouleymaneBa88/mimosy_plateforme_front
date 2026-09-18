<script setup>
import ConversationItem from './ConversationItem.vue'
defineProps({ conversations: { type: Array, default: () => [] }, activeId: { type: [Number, String], default: null }, search: { type: String, default: '' } })
defineEmits(['select'])
</script>
<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto"><ConversationItem v-for="conversation in conversations" :key="conversation.id" :conversation="conversation" :active="conversation.id === activeId" @select="$emit('select', $event)" /><p v-if="!conversations.length" class="p-8 text-center text-sm text-[#64748B]">Aucune conversation trouvée.</p></div>
</template>
