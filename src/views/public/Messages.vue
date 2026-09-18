<script setup>
import { ref, computed, nextTick, watch } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'

/**
 * --------------------------------------------------------------------------
 * DONNÉES DE DÉMONSTRATION
 * --------------------------------------------------------------------------
 * À remplacer par un appel API (GET /conversations) une fois le back branché.
 * Chaque conversation contient son propre fil de messages, chargé séparément
 * dans un cas réel (GET /conversations/:id/messages) pour éviter de tout
 * charger d'un coup.
 */
const demoConversations = ref([
  {
    id: 1,
    nom: 'Moussa Ba',
    avatar: 'https://placehold.co/56x56',
    service: 'Électricité',
    enLigne: true,
    dernierMessage: 'Je peux intervenir à 16 h.',
    heure: '14:20',
    nonLu: true,
    messages: [
      {
        id: 1,
        auteur: 'prestataire',
        texte: "Bonjour Aïssatou. J'ai bien reçu votre demande pour la fuite sous l'évier.",
        heure: '14:15',
      },
      {
        id: 2,
        auteur: 'client',
        texte: "Bonjour Moussa. Super, est-ce que vous pouvez passer dans l'après-midi ? C'est assez urgent.",
        heure: '14:18',
      },
      {
        id: 3,
        auteur: 'prestataire',
        texte: 'Je peux intervenir à 16 h. Je viens de vous envoyer le devis estimatif.',
        heure: '14:20',
      },
    ],
  },

  {
    id: 2,
    nom: 'Ibrahima Sarr',
    avatar: 'https://placehold.co/56x56',
    service: 'Plomberie',
    enLigne: false,
    dernierMessage: 'Le devis a été envoyé pour validation.',
    heure: 'Hier',
    nonLu: false,
    messages: [
      {
        id: 1,
        auteur: 'prestataire',
        texte: 'Le devis a été envoyé pour validation.',
        heure: 'Hier · 18:02',
      },
    ],
  },

  {
    id: 3,
    nom: 'Ndeye Services',
    avatar: 'https://placehold.co/56x56',
    service: 'Ménage',
    enLigne: false,
    dernierMessage: 'Merci pour votre confiance !',
    heure: 'Lun',
    nonLu: false,
    messages: [
      {
        id: 1,
        auteur: 'prestataire',
        texte: 'Merci pour votre confiance !',
        heure: 'Lundi · 09:40',
      },
    ],
  },
])

// L'API de messagerie n'est pas exposée par Django : aucune conversation fictive n'est affichée.
const conversations = ref([])

// Conversation actuellement sélectionnée (id). On ouvre la première par défaut.
const activeConversationId = ref(conversations.value[0]?.id ?? null)

const activeConversation = computed(() =>
  conversations.value.find((conversation) => conversation.id === activeConversationId.value)
)

/**
 * Sélectionne une conversation et la marque comme lue.
 * Dans un vrai back, ça déclencherait aussi un PATCH /conversations/:id/lu.
 */
function selectionnerConversation(id) {
  activeConversationId.value = id

  const conversation = conversations.value.find((item) => item.id === id)

  if (conversation) {
    conversation.nonLu = false
  }
}

/**
 * --------------------------------------------------------------------------
 * RECHERCHE DE CONVERSATION
 * --------------------------------------------------------------------------
 */
const rechercheConversation = ref('')

const conversationsFiltrees = computed(() => {
  const recherche = rechercheConversation.value.trim().toLowerCase()

  if (!recherche) {
    return conversations.value
  }

  return conversations.value.filter((conversation) =>
    conversation.nom.toLowerCase().includes(recherche)
  )
})

/**
 * --------------------------------------------------------------------------
 * ENVOI DE MESSAGE
 * --------------------------------------------------------------------------
 */
const nouveauMessage = ref('')

// Référence à la zone de scroll des messages, pour défiler automatiquement en bas
const zoneMessages = ref(null)

function scrollVersLeBas() {
  nextTick(() => {
    if (zoneMessages.value) {
      zoneMessages.value.scrollTop = zoneMessages.value.scrollHeight
    }
  })
}

function envoyerMessage() {
  const texte = nouveauMessage.value.trim()

  if (!texte || !activeConversation.value) {
    return
  }

  activeConversation.value.messages.push({
    id: Date.now(),
    auteur: 'client',
    texte,
    heure: "À l'instant",
  })

  // Met aussi à jour l'aperçu affiché dans la liste de gauche
  activeConversation.value.dernierMessage = texte
  activeConversation.value.heure = "À l'instant"

  nouveauMessage.value = ''
  scrollVersLeBas()

  // À remplacer par POST /conversations/:id/messages
}

// Redescend automatiquement en bas quand on change de conversation
watch(activeConversationId, scrollVersLeBas)
</script>

<template>
  <AppLayout>
    <div class="flex h-full w-full">
      <!-- ==================================================================
           COLONNE GAUCHE : liste des conversations
           ================================================================== -->
      <div class="flex w-[400px] shrink-0 flex-col border-r border-[#E2E8F0]">
        <div class="flex flex-col gap-6 px-8 pb-4 pt-8">
          <h1 class="font-['Plus_Jakarta_Sans'] text-[28px] font-extrabold text-[#0F172A]">
            Messages
          </h1>

          <div class="relative">
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">
              🔍
            </span>

            <input
              v-model="rechercheConversation"
              type="text"
              placeholder="Rechercher une conversation"
              class="w-full rounded-xl bg-[#FAF5F0] py-3 pl-10 pr-4 text-sm text-[#0F172A] outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto">
          <button
            v-for="conversation in conversationsFiltrees"
            :key="conversation.id"
            type="button"
            class="flex items-center gap-4 border-b border-[#F1F5F9] p-4 text-left transition"
            :class="
              conversation.id === activeConversationId
                ? 'border-l-4 border-l-[#2F6250] bg-[#FFF3ED]'
                : 'border-l-4 border-l-transparent hover:bg-[#FAFAFA]'
            "
            @click="selectionnerConversation(conversation.id)"
          >
            <div class="relative shrink-0">
              <img
                :src="conversation.avatar"
                :alt="conversation.nom"
                class="h-14 w-14 rounded-full"
              />
              <span
                v-if="conversation.enLigne"
                class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2F6250]"
              ></span>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <p class="truncate text-[16px] font-bold text-[#64748B]">
                  {{ conversation.nom }}
                </p>
                <span class="shrink-0 text-[11px] text-[#64748B]">{{ conversation.heure }}</span>
              </div>

              <p
                class="truncate text-sm"
                :class="conversation.nonLu ? 'font-semibold text-[#334155]' : 'text-[#64748B]'"
              >
                {{ conversation.dernierMessage }}
              </p>
            </div>
          </button>

          <!-- État vide : aucune conversation ne correspond à la recherche -->
          <div
            v-if="conversationsFiltrees.length === 0"
            class="p-8 text-center text-sm text-[#64748B]"
          >
            Aucune conversation trouvée.
          </div>
        </div>
      </div>

      <!-- ==================================================================
           COLONNE DROITE : fil de discussion
           ================================================================== -->
      <div
        v-if="activeConversation"
        class="flex flex-1 flex-col"
      >
        <!-- En-tête -->
        <div class="flex items-center justify-between border-b border-[#E2E8F0] px-8 py-4">
          <div class="flex items-center gap-4">
            <img
              :src="activeConversation.avatar"
              :alt="activeConversation.nom"
              class="h-10 w-10 rounded-full"
            />

            <div>
              <p class="text-lg font-bold text-[#64748B]">{{ activeConversation.nom }}</p>

              <div class="flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full"
                  :class="activeConversation.enLigne ? 'bg-[#16805B]' : 'bg-[#CBD5E1]'"
                ></span>
                <p class="text-xs text-[#64748B]">
                  {{ activeConversation.enLigne ? 'En ligne' : 'Hors ligne' }} · {{ activeConversation.service }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <!-- <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] text-[#334155]"
              aria-label="Appeler"
            >
              📞
            </button> -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] text-[#334155]"
              aria-label="Plus d'options"
            >
              ⋮
            </button>
          </div>
        </div>

        <!-- Fil de messages -->
        <div
          ref="zoneMessages"
          class="flex flex-1 flex-col gap-6 overflow-y-auto p-8"
        >
          <!-- Séparateur de date : simplifié ici en un seul groupe "Aujourd'hui" -->
          <div class="flex justify-center">
            <span class="rounded-full bg-[#FAF5F0] px-3 py-1 text-[11px] font-bold uppercase text-[#64748B]">
              Aujourd'hui
            </span>
          </div>

          <div
            v-for="message in activeConversation.messages"
            :key="message.id"
            class="flex items-end gap-3"
            :class="message.auteur === 'client' ? 'flex-row-reverse self-end' : ''"
          >
            <img
              v-if="message.auteur === 'prestataire'"
              :src="activeConversation.avatar"
              class="h-8 w-8 rounded-full"
              alt=""
            />

            <div
              class="flex max-w-[480px] flex-col gap-1"
              :class="message.auteur === 'client' ? 'items-end' : 'items-start'"
            >
              <div
                class="px-4 py-3 text-sm leading-relaxed"
                :class="
                  message.auteur === 'client'
                    ? 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl bg-[#2F6250] text-white'
                    : 'rounded-tl-2xl rounded-tr-2xl rounded-br-2xl bg-[#F1F5F9] text-[#64748B]'
                "
              >
                {{ message.texte }}
              </div>

              <span class="px-1 text-[10px] text-[#64748B]">{{ message.heure }}</span>
            </div>
          </div>
        </div>

        <!-- Champ de saisie -->
        <div class="border-t border-[#E2E8F0] p-6">
          <form
            class="flex items-center gap-3 rounded-2xl bg-[#FAF5F0] p-2"
            @submit.prevent="envoyerMessage"
          >
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-lg text-[#64748B]"
              aria-label="Joindre un fichier"
            >
              📎
            </button>

            <input
              v-model="nouveauMessage"
              type="text"
              placeholder="Écrivez votre message ici..."
              class="flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#9CA3AF]"
            />

            <button
              type="submit"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F6250] text-white transition hover:bg-[#244B3D]"
              aria-label="Envoyer le message"
            >
              ➤
            </button>
          </form>
        </div>
      </div>

      <!-- Aucune conversation sélectionnée (ex: liste vide après filtre) -->
      <div
        v-else
        class="flex flex-1 items-center justify-center text-sm text-[#64748B]"
      >
        Sélectionnez une conversation pour l'afficher ici.
      </div>
    </div>
  </AppLayout>
</template>