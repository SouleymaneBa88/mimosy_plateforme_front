<script setup>
defineProps({
  tabs: {
    // Chaque onglet : { id, label, count }
    type: Array,
    required: true,
  },

  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex w-full items-center gap-1 overflow-x-auto border-b border-[#E2E8F0]">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="shrink-0 border-b-2 px-4 py-3 text-[15px] font-medium transition sm:px-6"
      :class="
        modelValue === tab.id
          ? 'border-[#2F6250] font-bold text-[#2F6250]'
          : 'border-transparent text-[#64748B] hover:text-[#051F20]'
      "
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }} ({{ tab.count }})
    </button>
  </div>
</template>