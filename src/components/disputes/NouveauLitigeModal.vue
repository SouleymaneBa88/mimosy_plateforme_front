<script setup>
/**
 * Ouverture d'un litige, partagée entre l'espace client et l'espace
 * prestataire (même formulaire des deux côtés) : seul le champ rempli
 * diffère (description_client ou description_prestataire), déterminé
 * par le rôle de l'appelant.
 */
// ref : donnée réactive ; watch : réagir aux changements.
import { ref, watch } from 'vue'

// La fenêtre modale et les appels à l'API des litiges.
import Modal from '@/components/common/Modal.vue'
import * as disputeService from '@/services/disputeService'

// Props : ouvert ou non, la demande concernée, et le rôle de l'utilisateur.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  demande: { type: Object, default: null },
  role: { type: String, required: true }, // 'CLIENT' | 'PRESTATAIRE'
})
// Événements : fermer la fenêtre, et "cree" quand le litige est créé.
const emit = defineEmits(['update:modelValue', 'cree'])

// Les champs du formulaire, l'état d'envoi et le message d'erreur.
const motif = ref('')
const description = ref('')
const loading = ref(false)
const errorMessage = ref('')

// À chaque ouverture, on vide le formulaire.
watch(() => props.modelValue, (ouvert) => {
  if (ouvert) {
    motif.value = ''
    description.value = ''
    errorMessage.value = ''
  }
})

// Ferme la fenêtre.
function fermer() {
  emit('update:modelValue', false)
}

// Envoie le litige au serveur.
async function soumettre() {
  // Motif et description sont obligatoires.
  if (!motif.value.trim() || !description.value.trim()) {
    errorMessage.value = 'Merci de préciser un motif et une description.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    // Selon le rôle, on remplit la description du client OU celle du prestataire.
    const litige = await disputeService.ouvrirLitige({
      demandePrestation: props.demande?.id,
      motif: motif.value.trim(),
      descriptionClient: props.role === 'CLIENT' ? description.value.trim() : '',
      descriptionPrestataire: props.role === 'PRESTATAIRE' ? description.value.trim() : '',
    })
    // Succès : on prévient le parent et on ferme.
    emit('cree', litige)
    fermer()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :model-value="modelValue" title="Signaler un litige" @update:model-value="fermer">
    <!-- Rappel de la prestation concernée. -->
    <p class="font-sans text-sm text-mimosy-secondary">
      Concerne la prestation « {{ demande?.service_nom || demande?.service?.nom || 'Service' }} ».
      Un administrateur MIMOSY examinera votre dossier et prendra la décision finale.
    </p>

    <!-- Les champs : motif et description. -->
    <div class="mt-4 flex flex-col gap-4">
      <label class="font-sans text-sm font-bold text-mimosy-text">
        Motif
        <input v-model="motif" type="text" placeholder="Ex. Travail non terminé" class="mt-1.5 w-full rounded-xl border border-mimosy-border px-3 py-2.5 font-sans text-sm font-normal text-mimosy-text outline-none transition focus:border-mimosy-primary" />
      </label>
      <label class="font-sans text-sm font-bold text-mimosy-text">
        Décrivez ce qui s'est passé
        <textarea v-model="description" rows="4" placeholder="Décrivez la situation avec le plus de détails possible..." class="mt-1.5 w-full rounded-xl border border-mimosy-border px-3 py-2.5 font-sans text-sm font-normal text-mimosy-text outline-none transition focus:border-mimosy-primary" />
      </label>
    </div>

    <!-- Message d'erreur éventuel. -->
    <p v-if="errorMessage" class="mt-3 rounded-xl bg-[#FFF0EE] px-3 py-2 font-sans text-sm text-[#A85148]">{{ errorMessage }}</p>

    <!-- Boutons Annuler / Ouvrir le litige. -->
    <div class="mt-6 flex justify-end gap-2.5">
      <button type="button" class="rounded-xl border border-mimosy-border px-4 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page" @click="fermer">
        Annuler
      </button>
      <button type="button" class="rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50" :disabled="loading" @click="soumettre">
        {{ loading ? 'Envoi...' : 'Ouvrir le litige' }}
      </button>
    </div>
  </Modal>
</template>
