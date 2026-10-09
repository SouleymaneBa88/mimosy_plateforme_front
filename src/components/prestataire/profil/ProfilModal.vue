<!--
  ProfilModal : fenêtre pour modifier le profil du prestataire
  (description, date de naissance, expérience, disponibilité).
  Envoie l'événement "save" avec les données du formulaire.
-->
<script setup>
// reactive : objet réactif ; watch : réagir quand une donnée change.
import { reactive, watch } from 'vue'
// La fenêtre modale commune.
import Modal from '@/components/common/Modal.vue'

// Props : ouvert ou non, le profil actuel, enregistrement en cours, message d'erreur.
const props = defineProps({
  modelValue: Boolean,
  profil: { type: Object, required: true },
  isSaving: Boolean,
  errorMessage: { type: String, default: '' },
})
// Événements : fermer la fenêtre, enregistrer.
const emit = defineEmits(['update:modelValue', 'save'])
// Les valeurs du formulaire.
const form = reactive({ description: '', date_naissance: '', experience: 0, disponibilite: true })

// Quand le profil change, on recopie ses valeurs dans le formulaire.
watch(
  () => props.profil,
  (value) => Object.assign(form, {
    description: value.description || '',
    date_naissance: value.date_naissance || '',
    experience: Number(value.experience || 0),
    disponibilite: value.disponibilite ?? true,
  }),
  { deep: true, immediate: true },
)

// Envoie les données au parent (date vide -> null pour Django).
function save() {
  emit('save', { ...form, date_naissance: form.date_naissance || null })
}
</script>

<template>
  <Modal :model-value="modelValue" title="Modifier mon profil" @update:model-value="$emit('update:modelValue', $event)">
    <!-- Le formulaire : description, date de naissance, expérience, disponibilité. -->
    <form class="grid gap-4" @submit.prevent="save">
      <textarea v-model="form.description" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]" placeholder="Description professionnelle" rows="4" />
      <label class="flex flex-col gap-1.5 text-xs font-bold text-[#68716C]">
        Date de naissance
        <input v-model="form.date_naissance" type="date" class="rounded-xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none" />
      </label>
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
