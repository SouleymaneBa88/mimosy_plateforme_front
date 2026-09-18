<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'De quel service avez-vous besoin ?',
  },

  placeholder: {
    type: String,
    default: 'Rechercher un service ou décrire votre besoin...',
  },

  buttonText: {
    type: String,
    default: 'Rechercher',
  },

  // Passe en mode "service + localisation" (utilisé sur la page Trouver un service)
  withLocation: {
    type: Boolean,
    default: false,
  },

  locationPlaceholder: {
    type: String,
    default: 'Quartier, ville...',
  },

  service: {
    type: String,
    default: '',
  },

  location: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['search'])

const serviceValue = ref(props.service)
const locationValue = ref(props.location)

// On garde les champs synchronisés si le parent modifie les props (ex: après un filtre externe)
watch(() => props.service, (value) => { serviceValue.value = value })
watch(() => props.location, (value) => { locationValue.value = value })

const handleSearch = () => {
  const service = serviceValue.value.trim()

  if (!service && !props.withLocation) {
    return
  }

  emit('search', {
    service,
    location: locationValue.value.trim(),
  })
}
</script>

<template>
  <section class="w-full rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:rounded-[20px] sm:p-5">
    <h2 class="mb-4 text-[18px] font-extrabold leading-7 text-[#051F20] sm:text-[20px] sm:leading-[30px]">
      {{ title }}
    </h2>

    <form class="flex w-full flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="handleSearch">
      <!-- Champ service -->
      <div class="flex min-h-[50px] w-full min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-3.5 transition focus-within:border-[#2F6250] focus-within:ring-2 focus-within:ring-[#2F6250]/10 sm:min-h-[56px] sm:px-4">
        <svg class="h-[18px] w-[18px] shrink-0 text-[#64748B] sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>

        <input
          v-model="serviceValue"
          type="text"
          :placeholder="placeholder"
          aria-label="Rechercher un service"
          class="min-w-0 flex-1 bg-transparent text-[14px] font-normal leading-5 text-[#051F20] outline-none placeholder:text-[#94A3B8] sm:text-[15px] sm:leading-[22.5px]"
        />
      </div>

      <!-- Champ localisation, seulement en mode avancé -->
      <div
        v-if="withLocation"
        class="flex min-h-[50px] w-full min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-3.5 transition focus-within:border-[#2F6250] focus-within:ring-2 focus-within:ring-[#2F6250]/10 sm:min-h-[56px] sm:px-4"
      >
        <svg class="h-[18px] w-[18px] shrink-0 text-[#64748B] sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>

        <input
          v-model="locationValue"
          type="text"
          :placeholder="locationPlaceholder"
          aria-label="Localisation"
          class="min-w-0 flex-1 bg-transparent text-[14px] font-normal leading-5 text-[#051F20] outline-none placeholder:text-[#94A3B8] sm:text-[15px] sm:leading-[22.5px]"
        />
      </div>

      <button
        type="submit"
        class="min-h-[50px] w-full shrink-0 rounded-[12px] bg-[#051F20] px-6 text-[13px] font-bold leading-5 text-white transition hover:bg-[#2F6250] active:bg-[#1D4033] sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-[14px] sm:leading-[21px]"
      >
        {{ buttonText }}
      </button>
    </form>
  </section>
</template>