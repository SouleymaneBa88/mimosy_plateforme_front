<script setup>
import { reactive, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'

const props = defineProps({
  modelValue: Boolean,
  profil: { type: Object, required: true },
  isSaving: Boolean,
  errorMessage: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'save'])
const form = reactive({ description: '', experience: 0, disponibilite: true })

watch(
  () => props.profil,
  (value) => Object.assign(form, {
    description: value.description || '',
    experience: Number(value.experience || 0),
    disponibilite: value.disponibilite ?? true,
  }),
  { deep: true, immediate: true },
)

function save() {
  emit('save', { ...form })
}
</script>

<template>
  <Modal :model-value="modelValue" title="Modifier mon profil" @update:model-value="$emit('update:modelValue', $event)">
    <form class="grid gap-4" @submit.prevent="save">
      <textarea v-model="form.description" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Description professionnelle" rows="4" />
      <input v-model.number="form.experience" type="number" min="0" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Années d'expérience" />
      <label class="flex items-center gap-2 text-sm text-[#334155]">
        <input v-model="form.disponibilite" type="checkbox" />
        Disponible pour recevoir des demandes
      </label>
      <p v-if="errorMessage" class="rounded-xl bg-[#FFF0EE] p-3 text-sm text-[#A85148]">{{ errorMessage }}</p>
      <button type="submit" :disabled="isSaving" class="rounded-xl bg-[#2F6250] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
        {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
    </form>
  </Modal>
</template>
