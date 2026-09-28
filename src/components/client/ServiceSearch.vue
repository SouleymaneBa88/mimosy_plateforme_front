<script setup>
/**
 * Barre de recherche CLIENT — UNE SEULE barre (pas de second champ
 * localisation séparé, voir SearchFilters.vue pour le filtre "Ville").
 * Disposition reprise de front_mimosy/src/components/clients/BarreRecherche.vue
 * (titre serif centré + champ recherche + bouton), avec le même contrat
 * props/événements qu'avant : la vraie logique de recherche (classique ou
 * intelligente) reste dans la page parente (voir HomeClient.vue).
 */
import { ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Trouver un prestataire',
  },

  placeholder: {
    type: String,
    default: 'Service, prestataire, quartier… ou décrivez votre besoin',
  },

  buttonText: {
    type: String,
    default: 'Rechercher',
  },

  service: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['search'])

const serviceValue = ref(props.service)

watch(() => props.service, (value) => { serviceValue.value = value })

const handleSearch = () => {
  // Objet conservé (plutôt qu'une simple chaîne) pour rester compatible avec
  // TrouverService.vue, qui déstructure toujours { service, location }.
  emit('search', { service: serviceValue.value.trim() })
}
</script>

<template>
  <section class="w-full bg-mimosy-surface px-4 py-8 sm:px-8 sm:py-12">
    <div class="mx-auto flex w-full flex-col items-center gap-6 sm:gap-8">
      <!-- Titre -->
      <h1 class="text-center font-serif text-[34px] italic leading-[42px] text-mimosy-text sm:text-[44px] sm:leading-[54px] lg:text-[56px] lg:leading-[70px]">
        {{ title }}
      </h1>

      <!-- Barre principale -->
      <form class="flex w-full max-w-[900px] flex-col items-stretch gap-3 sm:flex-row sm:items-center" @submit.prevent="handleSearch">
        <div class="flex h-14 min-w-0 flex-1 items-center rounded-[18px] border border-mimosy-border bg-mimosy-page px-5 sm:h-16 sm:px-6">
          <Search :size="20" :stroke-width="1.8" class="mr-3 shrink-0 text-mimosy-secondary" />
          <input
            v-model="serviceValue"
            type="text"
            :placeholder="placeholder"
            aria-label="Rechercher un prestataire"
            class="w-full min-w-0 border-0 bg-transparent font-sans text-base font-medium text-mimosy-text outline-none placeholder:text-mimosy-secondary"
          />
        </div>

        <button
          type="submit"
          class="flex h-14 w-full shrink-0 items-center justify-center rounded-[18px] bg-mimosy-primary px-10 font-sans text-base font-bold leading-6 text-white transition hover:opacity-90 sm:h-16 sm:w-auto"
        >
          {{ buttonText }}
        </button>
      </form>
    </div>
  </section>
</template>
