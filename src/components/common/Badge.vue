<script setup>
defineProps({ tone: { type: String, default: 'neutral' } })
</script>

<template>
  <span class="rounded-full px-3 py-1 text-xs font-bold" :class="{ 'bg-[#EAF8F2] text-[#16805B]': tone === 'success', 'bg-[#EDF4FF] text-[#3267B1]': tone === 'info', 'bg-[#FFF0EE] text-[#A85148]': tone === 'danger', 'bg-[#F1F5F9] text-[#64748B]': tone === 'neutral' }"><slot /></span>
</template>
