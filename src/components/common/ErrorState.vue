<script setup>
defineProps({ message: { type: String, default: 'Une erreur est survenue.' } })
defineEmits(['retry'])
</script>

<template>
  <div class="rounded-2xl border border-[#E7B8B2] bg-[#FFF0EE] p-8 text-center">
    <h3 class="font-bold text-[#A85148]">Impossible de charger les données</h3>
    <p class="mt-2 text-sm text-[#A85148]">{{ message }}</p>
    <button type="button" class="mt-4 rounded-xl bg-[#A85148] px-4 py-2 text-sm font-bold text-white" @click="$emit('retry')">Réessayer</button>
  </div>
</template>
