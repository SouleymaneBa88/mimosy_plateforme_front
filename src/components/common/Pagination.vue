<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  count: { type: Number, required: true },
  pageSize: { type: Number, default: 20 },
})
const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.count / props.pageSize)))

function aller(page) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between gap-3 px-1 py-2 text-sm text-[#64748B]">
    <p>Page {{ page }} sur {{ totalPages }} · {{ count }} résultat{{ count > 1 ? 's' : '' }}</p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#051F20] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        @click="aller(page - 1)"
      >
        Précédent
      </button>
      <button
        type="button"
        class="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#051F20] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="aller(page + 1)"
      >
        Suivant
      </button>
    </div>
  </div>
</template>
