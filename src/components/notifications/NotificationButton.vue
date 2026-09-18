<script setup>
import { Bell } from 'lucide-vue-next'
defineProps({ count: { type: Number, default: 0 } })
defineEmits(['click'])
</script>

<template>
  <button type="button" aria-label="Notifications" class="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white" @click="$emit('click')">
    <Bell class="h-[18px] w-[18px] text-[#64748B]" />
    <span v-if="count" class="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#2F6250] px-1 text-[9px] font-bold text-white">{{ count > 9 ? '9+' : count }}</span>
  </button>
</template>
