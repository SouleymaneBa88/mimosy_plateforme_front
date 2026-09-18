<script setup>
defineProps({ modelValue: { type: Boolean, default: false }, title: { type: String, default: '' } })
defineEmits(['update:modelValue'])
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center bg-[#051F20]/50 px-4 py-6" @click.self="$emit('update:modelValue', false)">
      <section class="w-full max-w-lg rounded-2xl bg-white" role="dialog" aria-modal="true" :aria-label="title">
        <header class="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5">
          <h2 class="text-lg font-extrabold text-[#051F20]">{{ title }}</h2>
          <button type="button" class="text-2xl text-[#64748B]" aria-label="Fermer" @click="$emit('update:modelValue', false)">×</button>
        </header>
        <div class="p-6"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>
