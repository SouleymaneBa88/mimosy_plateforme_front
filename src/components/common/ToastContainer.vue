<!--
  ToastContainer : affiche les petits messages temporaires ("toasts")
  en bas à droite de l'écran (succès en vert, erreur en rouge).
  Les messages viennent du composable useToast().
-->
<script setup>
import { useToast } from '@/composables/useToast'

// On récupère la liste partagée des toasts et la fonction pour en retirer un.
const { toasts, removeToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[200] flex w-full max-w-sm flex-col gap-2">
      <!-- Un bloc par toast ; la couleur dépend du type (erreur ou succès). -->
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg"
        :class="toast.type === 'error'
          ? 'border-[#E7B8B2] bg-[#FFF0EE] text-[#A85148]'
          : 'border-[#BFE3D3] bg-[#EAF8F2] text-[#16805B]'"
        role="status"
      >
        <span>{{ toast.message }}</span>
        <button type="button" class="shrink-0 text-lg leading-none opacity-70" aria-label="Fermer" @click="removeToast(toast.id)">×</button>
      </div>
    </div>
  </Teleport>
</template>
