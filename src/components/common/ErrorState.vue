<!--
  ErrorState : bloc affiché quand un chargement a échoué.
  Il montre le message d'erreur et un bouton "Réessayer"
  qui envoie l'événement "retry" au parent.
-->
<script setup>
// Prop : le message d'erreur à afficher.
defineProps({ message: { type: String, default: 'Une erreur est survenue.' } })
// Événement envoyé au parent quand on clique sur "Réessayer".
defineEmits(['retry'])
</script>

<template>
  <div class="rounded-2xl border border-[#E7B8B2] bg-[#FFF0EE] p-8 text-center">
    <h3 class="font-bold text-[#A85148]">Impossible de charger les données</h3>
    <p class="mt-2 text-sm text-[#A85148]">{{ message }}</p>
    <button type="button" class="mt-4 rounded-xl bg-[#A85148] px-4 py-2 text-sm font-bold text-white" @click="$emit('retry')">Réessayer</button>
  </div>
</template>
