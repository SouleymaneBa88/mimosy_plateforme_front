<!--
  EmptyState : bloc affiché quand une liste est vide.
  Props : title (titre), message (texte facultatif).
  Le <slot /> permet d'ajouter un contenu en plus (ex. un bouton).
-->
<script setup>
// Les données reçues du composant parent.
defineProps({
  title: { type: String, default: 'Aucun élément' },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="rounded-2xl border border-dashed border-[#D9DDD8] bg-white p-10 text-center">
    <h3 class="font-bold text-[#051F20]">{{ title }}</h3>
    <p v-if="message" class="mt-2 text-sm text-[#64748B]">{{ message }}</p>
    <slot />
  </div>
</template>
