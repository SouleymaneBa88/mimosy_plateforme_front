<script setup>
defineProps({ rendezVous: { type: Object, default: null } })
defineEmits(['close'])
</script>
<template><div v-if="rendezVous" class="rounded-2xl border border-[#E2E8F0] bg-white p-6"><div class="flex items-start justify-between"><div><p class="text-xs font-bold uppercase tracking-wide text-[#64748B]">Rendez-vous</p><h2 class="mt-2 text-xl font-extrabold text-[#051F20]">{{ rendezVous.service }}</h2></div><button type="button" class="text-xl text-[#64748B]" aria-label="Fermer" @click="$emit('close')">×</button></div><div class="mt-5 grid gap-3 text-sm text-[#334155]"><p><strong>Client :</strong> {{ rendezVous.client }}</p><p><strong>Date :</strong> {{ rendezVous.date }} {{ rendezVous.mois }} à {{ rendezVous.heure }}</p><p><strong>Lieu :</strong> {{ rendezVous.localisation }}</p></div></div></template>
