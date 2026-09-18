<script setup>
import { reactive, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
const props = defineProps({
  modelValue: Boolean,
  service: { type: Object, default: null },
  catalogue: { type: Array, default: () => [] },
  isSaving: Boolean,
  errorMessage: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'save'])
const form = reactive({ service: '', description: '', prix: 0, unite: 'prestation', disponible: true })

watch(
  () => props.service,
  (service) => Object.assign(form, {
    service: service?.service || '',
    description: service?.description || '',
    prix: Number(service?.prix || 0),
    unite: service?.unite || 'prestation',
    disponible: service?.disponible ?? true,
  }),
  { immediate: true },
)

function save() {
  if (!form.service || form.prix <= 0) return
  emit('save', { ...form })
}
</script>
<template>
  <Modal :model-value="modelValue" :title="service ? 'Modifier le service' : 'Ajouter un service'" @update:model-value="$emit('update:modelValue', $event)">
    <form class="grid gap-4" @submit.prevent="save">
      <select v-model="form.service" :disabled="Boolean(service)" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none disabled:bg-[#F8FAFC]">
        <option value="">Choisir un service du catalogue</option>
        <option v-for="item in catalogue" :key="item.id" :value="item.id">
          {{ item.nom }}{{ item.categorie_nom ? ` - ${item.categorie_nom}` : '' }}
        </option>
      </select>
      <textarea v-model="form.description" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Description de votre offre" rows="3" />
      <div class="grid gap-3 sm:grid-cols-[1fr_160px]">
        <input v-model.number="form.prix" type="number" min="1" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Prix" />
        <input v-model="form.unite" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Unité" />
      </div>
      <label class="flex items-center gap-2 text-sm text-[#334155]">
        <input v-model="form.disponible" type="checkbox" />
        Offre disponible
      </label>
      <p v-if="errorMessage" class="rounded-xl bg-[#FFF0EE] p-3 text-sm text-[#A85148]">{{ errorMessage }}</p>
      <button type="submit" :disabled="isSaving" class="rounded-xl bg-[#2F6250] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
        {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
    </form>
  </Modal>
</template>
