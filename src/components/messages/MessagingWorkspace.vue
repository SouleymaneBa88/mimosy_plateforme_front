<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getMessages,
  createMessage,
} from '@/services/messageService'

defineProps({
  role: {
    type: String,
    default: 'client',
  },
})

const route = useRoute()
const router = useRouter()

const conversations = ref([])
const activeId = ref(null)
const search = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref(null)

/*
 * Sur mobile, on affiche soit la liste,
 * soit la conversation ouverte — jamais les deux
 * en même temps (manque de place).
 */
const showConversationOnMobile = ref(false)

/*
 * ID du ProfilPrestataire.
 *
 * Il vient de :
 * /messages?prestataire=UUID
 */
const pendingPrestataireId = ref(
  route.query.prestataire
    ? String(route.query.prestataire)
    : null
)

function getQueryString(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value ? String(value) : ''
}

const contactName = computed(() =>
  getQueryString(route.query.nom)
)

const contactAvatar = computed(() =>
  getQueryString(route.query.avatar)
)

const contactService = computed(() =>
  getQueryString(route.query.service)
)

const currentUserId = ref(null)

/**
 * Décode le payload du JWT.
 */
function getCurrentUserId() {
  const token = localStorage.getItem(
    'mimosy_access_token'
  )

  if (!token) {
    return null
  }

  try {
    const parts = token.split('.')

    if (parts.length !== 3) {
      return null
    }

    let base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    base64 += '='.repeat(
      (4 - (base64.length % 4)) % 4
    )

    const binary = atob(base64)

    const bytes = Uint8Array.from(
      binary,
      (char) => char.charCodeAt(0)
    )

    const json = new TextDecoder().decode(bytes)

    const payload = JSON.parse(json)

    return (
      payload.user_id ??
      payload.id ??
      payload.sub ??
      null
    )
  } catch (error) {
    console.error(
      'Impossible de lire le JWT :',
      error
    )

    return null
  }
}

/**
 * Retourne l'identifiant d'un utilisateur
 * qu'il soit un objet ou un ID.
 */
function getUserId(user) {
  if (!user) {
    return null
  }

  if (typeof user === 'object') {
    return user.id ?? user.pk ?? null
  }

  return user
}

/**
 * Retourne le nom d'un utilisateur.
 */
function getUserName(user) {
  if (!user) {
    return 'Utilisateur'
  }

  if (
    typeof user === 'string' ||
    typeof user === 'number'
  ) {
    return `Utilisateur ${user}`
  }

  return (
    user.nom_complet ||
    user.full_name ||
    `${user.first_name || user.prenom || ''} ${
      user.last_name || user.nom || ''
    }`.trim() ||
    user.username ||
    user.email ||
    'Utilisateur'
  )
}

/**
 * Supporte une liste directe ou une réponse paginée DRF.
 */
function extractResults(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

/**
 * Convertit les messages Django en conversations.
 */
function buildConversations(messages) {
  const map = new Map()

  messages.forEach((message) => {
    const expediteur =
      message.expediteur_info ??
      message.expediteur ??
      message.sender ??
      message.from

    const destinataire =
      message.destinataire_info ??
      message.destinataire ??
      message.receiver ??
      message.to

    const expediteurId =
      getUserId(expediteur)

    const destinataireId =
      getUserId(destinataire)

    if (!expediteurId && !destinataireId) {
      return
    }

    const interlocuteur =
      currentUserId.value !== null &&
      String(expediteurId) ===
        String(currentUserId.value)
        ? destinataire
        : expediteur

    const interlocuteurId =
      getUserId(interlocuteur)

    if (!interlocuteurId) {
      return
    }

    const key = String(interlocuteurId)

    if (!map.has(key)) {
      map.set(key, {
        id: key,

        nom: getUserName(interlocuteur),

        avatar:
          interlocuteur?.profile_photo ||
          interlocuteur?.photo_profil ||
          interlocuteur?.photo ||
          '',

        enLigne:
          interlocuteur?.is_online ??
          interlocuteur?.en_ligne ??
          false,

        service:
          message.service?.nom ||
          message.service?.name ||
          interlocuteur?.service ||
          '',

        nonLu: false,

        /*
         * Ici il s'agit de l'ID User du participant.
         */
        destinataireId: interlocuteurId,

        dernierMessage: '',
        heure: '',
        messages: [],
      })
    }

    const conversation = map.get(key)

    conversation.messages.push(message)

    conversation.dernierMessage =
      message.contenu ||
      message.texte ||
      ''

    const dateValue =
      message.date_envoi ||
      message.created_at ||
      message.createdAt

    if (dateValue) {
      const date = new Date(dateValue)

      if (!Number.isNaN(date.getTime())) {
        conversation.heure =
          date.toLocaleTimeString(
            'fr-FR',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          )
      }
    }

    if (
      message.lu === false &&
      currentUserId.value !== null &&
      String(expediteurId) !==
        String(currentUserId.value)
    ) {
      conversation.nonLu = true
    }
  })

  return Array.from(map.values()).map(
    (conversation) => {
      conversation.messages.sort(
        (a, b) => {
          const dateA = new Date(
            a.date_envoi ||
            a.created_at ||
            a.createdAt ||
            0
          ).getTime()

          const dateB = new Date(
            b.date_envoi ||
            b.created_at ||
            b.createdAt ||
            0
          ).getTime()

          return dateA - dateB
        }
      )

      return conversation
    }
  )
}

/**
 * Conversation temporaire lorsqu'on arrive
 * depuis "Contacter le prestataire".
 */
const draftConversation = computed(() => {
  if (!pendingPrestataireId.value) {
    return null
  }

  return {
    id: `draft-${pendingPrestataireId.value}`,

    nom:
      contactName.value ||
      'Prestataire',

    avatar: contactAvatar.value,

    enLigne: false,

    service: contactService.value,

    nonLu: false,

    /*
     * IMPORTANT :
     * Ceci est l'ID du ProfilPrestataire,
     * pas l'ID User.
     */
    profilPrestataireId:
      pendingPrestataireId.value,

    destinataireId: null,

    dernierMessage: '',

    heure: '',

    messages: [],
  }
})

const active = computed(() => {
  const existing =
    conversations.value.find(
      (conversation) =>
        String(conversation.id) ===
        String(activeId.value)
    )

  if (existing) {
    return existing
  }

  if (
    draftConversation.value &&
    String(activeId.value) ===
      String(draftConversation.value.id)
  ) {
    return draftConversation.value
  }

  return null
})

const filtered = computed(() => {
  const value = search.value
    .trim()
    .toLowerCase()

  if (!value) {
    return conversations.value
  }

  return conversations.value.filter(
    (item) =>
      item.nom
        ?.toLowerCase()
        .includes(value)
  )
})

/**
 * Liste combinée (brouillon + conversations filtrées),
 * utilisée par la sidebar et pour savoir si la liste est vide.
 */
const conversationsToShow = computed(() => [
  ...(draftConversation.value ? [draftConversation.value] : []),
  ...filtered.value,
])

const hasNoConversation = computed(
  () =>
    !loading.value &&
    conversationsToShow.value.length === 0
)

async function loadMessages() {
  loading.value = true
  error.value = null

  try {
    currentUserId.value =
      getCurrentUserId()

    const response =
      await getMessages()

    const messages =
      extractResults(response)

    conversations.value =
      buildConversations(messages)

    /*
     * Arrivée depuis "Contacter le prestataire".
     *
     * On ouvre immédiatement une conversation
     * temporaire basée sur le ProfilPrestataire.
     */
    if (pendingPrestataireId.value) {
      activeId.value =
        `draft-${pendingPrestataireId.value}`

      showConversationOnMobile.value = true

      return
    }

    /*
     * Sinon on ouvre la première conversation.
     */
    if (
      !activeId.value &&
      conversations.value.length > 0
    ) {
      activeId.value =
        conversations.value[0].id
    }
  } catch (err) {
    console.error(
      'Erreur chargement messages :',
      err
    )

    error.value =
      err?.message ||
      'Impossible de charger les messages.'
  } finally {
    loading.value = false
  }
}

function select(id) {
  activeId.value = id
  showConversationOnMobile.value = true

  const conversation =
    conversations.value.find(
      (item) =>
        String(item.id) ===
        String(id)
    )

  if (conversation) {
    conversation.nonLu = false
  }
}

function backToList() {
  showConversationOnMobile.value = false
}

async function send(payload) {
  const contenu =
    typeof payload === 'string'
      ? payload.trim()
      : payload?.contenu?.trim() || ''

  if (!contenu) {
    return
  }

  const isNewConversation =
    Boolean(pendingPrestataireId.value)

  sending.value = true
  error.value = null

  try {
    let response

    if (isNewConversation) {
      response = await createMessage({
        prestataire: pendingPrestataireId.value,
        contenu,
      })
    } else {
      const destinataireId =
        active.value?.destinataireId

      if (!destinataireId) {
        throw new Error(
          'Destinataire introuvable.'
        )
      }

      response = await createMessage({
        destinataire: destinataireId,
        contenu,
      })
    }

    const newMessage = {
      id: response.id,
      expediteur: response.expediteur,
      destinataire: response.destinataire,
      contenu: response.contenu,
      lu: response.lu,
      date_envoi: response.date_envoi,
    }

    let conversation =
      conversations.value.find(
        (item) =>
          String(item.id) ===
          String(activeId.value)
      )

    if (!conversation) {
      conversation = {
        id: `conversation-${Date.now()}`,

        nom:
          contactName.value ||
          'Prestataire',

        avatar:
          contactAvatar.value,

        enLigne: false,

        service:
          contactService.value,

        nonLu: false,

        destinataireId:
          getUserId(
            response.destinataire
          ),

        dernierMessage: '',
        heure: '',
        messages: [],
      }

      conversations.value.unshift(
        conversation
      )
    }

    /*
     * Après le premier message,
     * on connaît maintenant l'ID User
     * du destinataire.
     */
    const responseDestinataireId =
      getUserId(
        response.destinataire
      )

    if (responseDestinataireId) {
      conversation.destinataireId =
        responseDestinataireId
    }

    conversation.messages.push(
      newMessage
    )

    conversation.dernierMessage =
      contenu

    conversation.heure =
      new Date().toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )

    activeId.value =
      conversation.id

    /*
     * Très important :
     * après le premier message,
     * on quitte le mode "nouveau contact".
     */
    pendingPrestataireId.value = null

    await router.replace({
      path: '/messages',
      query: {},
    })
  } catch (err) {
    console.error(
      'Erreur lors de l’envoi :',
      err
    )

    error.value =
      err?.message ||
      'Impossible d’envoyer le message.'
  } finally {
    sending.value = false
  }
}

onMounted(loadMessages)

/* ---------------------------------------------------------------- *
 * Aides d'affichage pour le template ci-dessous (style repris de
 * front_mimosy, principes UX inspirés de WhatsApp Web sans en copier
 * l'identité visuelle).
 * ---------------------------------------------------------------- */
const texteSaisie = ref('')

function envoyerDepuisChamp() {
  if (sending.value) return
  const contenu = texteSaisie.value
  texteSaisie.value = ''
  send(contenu)
}

function estDeMoi(message) {
  const expediteurId = getUserId(message.expediteur_info ?? message.expediteur ?? message.sender ?? message.from)
  return currentUserId.value !== null && String(expediteurId) === String(currentUserId.value)
}

function initiales(nom) {
  return (nom || '?').trim().charAt(0).toUpperCase() || '?'
}
</script>

<template>
  <div class="flex h-[calc(100vh-13rem)] overflow-hidden rounded-[24px] border border-mimosy-border bg-mimosy-surface sm:h-[calc(100vh-14rem)]">
    <!-- ═══════════════ Colonne gauche : conversations (≈32%) ═══════════════ -->
    <aside class="flex w-full shrink-0 flex-col border-r border-mimosy-border sm:w-[320px] lg:w-[34%]" :class="{ hidden: showConversationOnMobile, 'sm:flex': true }">
      <div class="border-b border-mimosy-border px-5 py-4">
        <h1 class="font-serif text-xl text-mimosy-text">Messages</h1>
        <div class="relative mt-3">
          <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mimosy-secondary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6" />
            <path d="M17 17L13.5 13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <input v-model="search" type="search" placeholder="Rechercher une conversation" class="w-full rounded-xl border border-transparent bg-mimosy-page py-2.5 pl-10 pr-3 font-sans text-sm text-mimosy-text outline-none transition focus:border-mimosy-primary focus:bg-mimosy-surface" />
        </div>
      </div>

      <div v-if="loading" class="flex items-center gap-2 px-5 py-6 font-sans text-sm text-mimosy-secondary">
        <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mimosy-border border-t-mimosy-primary" />
        Chargement des conversations…
      </div>

      <div v-else-if="error" class="mx-4 mt-4 rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm text-[#A85148]" role="alert">{{ error }}</div>

      <div v-else-if="hasNoConversation" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-mimosy-page text-mimosy-text">
          <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5h-.5A1.5 1.5 0 0 1 3 15.5v-10Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>
        </div>
        <p class="font-sans text-sm text-mimosy-secondary">Aucune conversation pour le moment.</p>
      </div>

      <ul v-else class="flex-1 overflow-y-auto">
        <li v-for="conversation in conversationsToShow" :key="conversation.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 border-b border-mimosy-border/60 px-5 py-3.5 text-left transition"
            :class="String(activeId) === String(conversation.id) ? 'bg-mimosy-primaryBg' : 'hover:bg-mimosy-page'"
            @click="select(conversation.id)"
          >
            <div class="relative shrink-0">
              <img v-if="conversation.avatar" :src="conversation.avatar" :alt="`Photo de ${conversation.nom}`" class="h-12 w-12 rounded-full object-cover" />
              <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-mimosy-primary font-serif text-white">{{ initiales(conversation.nom) }}</div>
              <span v-if="conversation.enLigne" class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-mimosy-surface bg-mimosy-primary" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate font-sans text-sm font-bold text-mimosy-text">{{ conversation.nom }}</p>
                <span v-if="conversation.heure" class="shrink-0 font-sans text-[11px] text-mimosy-secondary">{{ conversation.heure }}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <p class="truncate font-sans text-xs text-mimosy-secondary">{{ conversation.dernierMessage || conversation.service || 'Nouvelle conversation' }}</p>
                <span v-if="conversation.nonLu" class="h-2 w-2 shrink-0 rounded-full bg-mimosy-primary" />
              </div>
            </div>
          </button>
        </li>
      </ul>
    </aside>

    <!-- ═══════════════ Colonne droite : conversation active (≈66%) ═══════════════ -->
    <main class="flex min-w-0 flex-1 flex-col" :class="{ hidden: !showConversationOnMobile, 'sm:flex': true }">
      <template v-if="active">
        <!-- En-tête -->
        <div class="flex items-center gap-3 border-b border-mimosy-border px-5 py-3.5">
          <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mimosy-text transition hover:bg-mimosy-page sm:hidden" aria-label="Retour aux conversations" @click="backToList">
            <svg viewBox="0 0 20 20" fill="none" class="h-4.5 w-4.5"><path d="M12.5 15.5 7 10l5.5-5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <img v-if="active.avatar" :src="active.avatar" :alt="`Photo de ${active.nom}`" class="h-10 w-10 shrink-0 rounded-full object-cover" />
          <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mimosy-primary font-serif text-white">{{ initiales(active.nom) }}</div>

          <div class="min-w-0">
            <p class="truncate font-sans text-sm font-bold text-mimosy-text">{{ active.nom }}</p>
            <p class="truncate font-sans text-xs text-mimosy-secondary">{{ active.enLigne ? 'En ligne' : (active.service || 'Prestataire MIMOSY') }}</p>
          </div>
        </div>

        <!-- Messages -->
        <div class="flex-1 space-y-2 overflow-y-auto bg-mimosy-page/40 px-4 py-5 sm:px-6">
          <div v-if="!active.messages.length" class="flex h-full items-center justify-center font-sans text-sm text-mimosy-secondary">
            Aucun message pour le moment. Envoyez le premier !
          </div>
          <div
            v-for="message in active.messages"
            :key="message.id"
            class="flex"
            :class="estDeMoi(message) ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[78%] rounded-2xl px-4 py-2.5 font-sans text-sm leading-relaxed sm:max-w-[65%]"
              :class="estDeMoi(message) ? 'rounded-br-sm bg-mimosy-primary text-white' : 'rounded-bl-sm bg-mimosy-surface text-mimosy-text shadow-sm'"
            >
              <p class="whitespace-pre-wrap break-words">{{ message.contenu || message.texte }}</p>
              <p class="mt-1 text-right font-sans text-[10px]" :class="estDeMoi(message) ? 'text-white/70' : 'text-mimosy-secondary'">
                {{ new Date(message.date_envoi || message.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Saisie -->
        <div class="border-t border-mimosy-border px-4 py-3 sm:px-6">
          <p v-if="error" class="mb-2 rounded-xl bg-[#FFF0EE] px-3 py-2 font-sans text-xs text-[#A85148]" role="alert">{{ error }}</p>
          <form class="flex items-center gap-2.5" @submit.prevent="envoyerDepuisChamp">
            <input
              v-model="texteSaisie"
              type="text"
              placeholder="Écrire un message…"
              class="flex-1 rounded-full border border-mimosy-border bg-mimosy-page px-4 py-2.5 font-sans text-sm text-mimosy-text outline-none transition focus:border-mimosy-primary focus:bg-mimosy-surface"
              :disabled="sending"
            />
            <button
              type="submit"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mimosy-primary text-white transition hover:opacity-90 disabled:opacity-50"
              :disabled="sending || !texteSaisie.trim()"
              aria-label="Envoyer"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-4.5 w-4.5"><path d="M3 10h13M11 4l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </form>
        </div>
      </template>

      <!-- Aucune conversation sélectionnée -->
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-mimosy-primaryBg text-mimosy-primary">
          <svg viewBox="0 0 24 24" fill="none" class="h-8 w-8"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5h-.5A1.5 1.5 0 0 1 3 15.5v-10Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" /></svg>
        </div>
        <p class="font-serif text-lg text-mimosy-text">Sélectionnez une conversation</p>
        <p class="max-w-xs font-sans text-sm text-mimosy-secondary">Vos échanges avec les prestataires apparaîtront ici.</p>
      </div>
    </main>
  </div>
</template>
