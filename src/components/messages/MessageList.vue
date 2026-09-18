<script setup>
import MessageBubble from './MessageBubble.vue'
defineProps({ messages: { type: Array, default: () => [] }, avatar: { type: String, default: '' } })
</script>
<template>
  <div class="flex flex-col gap-5"><div class="flex justify-center"><span class="rounded-full bg-[#FAF5F0] px-3 py-1 text-[11px] font-bold uppercase text-[#64748B]">Aujourd'hui</span></div><MessageBubble v-for="message in messages" :key="message.id" :message="message" :avatar="avatar" /></div>
</template>
