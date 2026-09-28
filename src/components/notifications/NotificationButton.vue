<script setup>
import { Bell } from 'lucide-vue-next'
defineProps({ count: { type: Number, default: 0 } })
defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    aria-label="Notifications"
    class="relative flex h-10 w-10 items-center justify-center rounded-full border border-mimosy-border bg-mimosy-surface transition hover:border-mimosy-primary hover:bg-mimosy-primaryBg"
    @click="$emit('click')"
  >
    <Bell class="h-[18px] w-[18px] text-mimosy-secondary" />
    <span v-if="count" class="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-mimosy-primary px-1 font-sans text-[9px] font-bold text-white">{{ count > 9 ? '9+' : count }}</span>
  </button>
</template>
