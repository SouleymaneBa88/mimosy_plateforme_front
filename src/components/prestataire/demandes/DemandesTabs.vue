<script setup>
defineProps({ tabs: { type: Array, required: true }, modelValue: { type: String, required: true } })
defineEmits(['update:modelValue'])
</script>
<template><div class="flex gap-2 overflow-x-auto border-b border-[#E2E8F0]"><button v-for="tab in tabs" :key="tab.id" type="button" class="shrink-0 border-b-2 px-3 py-3 text-sm font-bold" :class="modelValue === tab.id ? 'border-[#2F6250] text-[#2F6250]' : 'border-transparent text-[#64748B]'" @click="$emit('update:modelValue', tab.id)">{{ tab.label }} <span class="ml-1 text-xs">{{ tab.count }}</span></button></div></template>
