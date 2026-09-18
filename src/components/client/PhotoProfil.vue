<script setup>
import { Camera, UserRound } from 'lucide-vue-next'

/**
 * Composant reutilisable pour afficher et modifier la photo de profil.
 *
 * - En mode `large`, il affiche la photo, le nom, l'email et le bouton d'upload.
 * - En mode `small`, il sert d'avatar compact dans les headers.
 * - L'upload reste volontairement cote front ici : le parent recoit le fichier
 *   via l'evenement `selected` pour l'envoyer ensuite au back-end.
 */
defineProps({
  photo: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: 'Utilisateur Mimosy',
  },
  email: {
    type: String,
    default: '',
  },
  editable: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    default: 'large',
    validator: (value) => ['small', 'large'].includes(value),
  },
})

const emit = defineEmits(['update:photo', 'selected'])

// Id unique pour lier le label visible a l'input file cache.
const inputId = `photo-profil-${Math.random().toString(36).slice(2)}`

function onPhotoSelectionnee(event) {
  const fichier = event.target.files?.[0]

  if (!fichier) {
    return
  }

  if (!fichier.type.startsWith('image/')) {
    console.warn("Le fichier sélectionné n'est pas une image")
    event.target.value = ''
    return
  }

  const tailleMax = 5 * 1024 * 1024

  if (fichier.size > tailleMax) {
    console.warn('Image trop lourde (max 5 Mo)')
    event.target.value = ''
    return
  }

  const previewUrl = URL.createObjectURL(fichier)
  // Met a jour l'aperçu immediatement, puis remonte le vrai fichier au parent.
  emit('update:photo', previewUrl)
  emit('selected', fichier)
  event.target.value = ''
}
</script>

<template>
  <div
    class="flex min-w-0 items-center"
    :class="size === 'large' ? 'gap-4' : 'gap-2'"
  >
    <div
      class="relative shrink-0 overflow-hidden rounded-full border border-[#E2E8F0] bg-[#FFF3ED]"
      :class="size === 'large' ? 'h-20 w-20' : 'h-[42px] w-[42px]'"
    >
      <img
        v-if="photo"
        :src="photo"
        :alt="`Photo de ${name}`"
        class="h-full w-full object-cover"
      />

      <div
        v-else
        class="flex h-full w-full items-center justify-center text-[#2F6250]"
      >
        <UserRound :class="size === 'large' ? 'h-8 w-8' : 'h-5 w-5'" />
      </div>
    </div>

    <div v-if="size === 'large'" class="min-w-0 flex-1">
      <p class="truncate text-base font-extrabold text-[#051F20]">{{ name }}</p>
      <p v-if="email" class="truncate text-sm text-[#64748B]">{{ email }}</p>

      <label
        v-if="editable"
        :for="inputId"
        class="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#2F6250] px-3 py-2 text-sm font-bold text-[#2F6250] transition hover:bg-[#FFF3ED]"
      >
        <Camera class="h-4 w-4" />
        Modifier la photo
      </label>

      <input
        v-if="editable"
        :id="inputId"
        type="file"
        accept="image/*"
        class="sr-only"
        @change="onPhotoSelectionnee"
      />
    </div>
  </div>
</template>
