<script setup>
import { computed, ref } from 'vue'
import ConversationList from './ConversationList.vue'
import ConversationHeader from './ConversationHeader.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const props = defineProps({ role: { type: String, default: 'client' } })

const conversations = ref([])
const activeNom = ref(null)
const search = ref('')

const active = computed(() => conversations.value.find((item) => item.nom === activeNom.value))

const filtered = computed(() => {
  const value = search.value.trim().toLowerCase()
  return value ? conversations.value.filter((item) => item.nom.toLowerCase().includes(value)) : conversations.value
})

function select(nom) {
  activeNom.value = nom
  const item = conversations.value.find((conversation) => conversation.nom === nom)
  if (item) item.nonLu = false
}

function send() { /* L'API de messagerie n'est pas exposée par Django. */ }
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
    <aside class="flex w-full shrink-0 flex-col border-r border-[#E2E8F0] md:w-[340px]">
      <div class="p-5">
        <h1 class="text-2xl font-extrabold text-[#051F20]">Messages</h1>
        <input v-model="search" type="search" placeholder="Rechercher une conversation" class="mt-5 w-full rounded-xl bg-[#FAF5F0] px-4 py-3 text-sm outline-none" />
      </div>
      <ConversationList :conversations="filtered" :active-nom="activeNom" @select="select" />
    </aside>

    <main v-if="active" class="hidden min-w-0 flex-1 flex-col md:flex">
      <ConversationHeader :conversation="active" />
      <div class="flex-1 overflow-y-auto p-5 sm:p-8">
        <MessageList :messages="active.messages" :avatar="active.avatar" />
      </div>
      <div class="border-t border-[#E2E8F0] p-5">
        <MessageInput @send="send" />
      </div>
    </main>
    <main v-else class="hidden flex-1 items-center justify-center text-sm text-[#64748B] md:flex">Sélectionnez une conversation.</main>
  </div>
</template>