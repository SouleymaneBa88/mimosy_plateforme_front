<script setup>
import { ref } from 'vue'
const message = ref('')
const emit = defineEmits(['send'])
function submit() { const value = message.value.trim(); if (!value) return; emit('send', value); message.value = '' }
</script>
<template>
  <form class="flex items-center gap-3 rounded-2xl bg-[#FAF5F0] p-2" @submit.prevent="submit"><button type="button" class="flex h-10 w-10 items-center justify-center rounded-lg text-[#64748B]" aria-label="Joindre un fichier">📎</button><input v-model="message" type="text" placeholder="Écrivez votre message ici..." class="min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#9CA3AF]" /><button type="submit" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F6250] text-white" aria-label="Envoyer">➤</button></form>
</template>
