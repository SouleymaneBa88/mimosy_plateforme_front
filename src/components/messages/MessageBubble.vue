<script setup>
defineProps({ message: { type: Object, required: true }, avatar: { type: String, default: '' } })
</script>
<template>
  <div class="flex items-end gap-3" :class="message.auteur === 'client' ? 'flex-row-reverse self-end' : ''"><img v-if="message.auteur !== 'client' && avatar" :src="avatar" alt="" class="h-8 w-8 rounded-full object-cover" /><div class="flex max-w-[min(480px,80vw)] flex-col gap-1" :class="message.auteur === 'client' ? 'items-end' : 'items-start'"><div class="px-4 py-3 text-sm leading-relaxed" :class="message.auteur === 'client' ? 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl bg-[#2F6250] text-white' : 'rounded-tl-2xl rounded-tr-2xl rounded-br-2xl bg-[#F1F5F9] text-[#64748B]'">{{ message.texte }}</div><span class="px-1 text-[10px] text-[#64748B]">{{ message.heure }}</span></div></div>
</template>
