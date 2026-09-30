<script setup>
/**
 * Filtres avancés de la recherche : catégorie, compétence, ville,
 * disponibilité, et rayon de recherche (utile seulement si "Autour de
 * moi" est actif). Le composant ne détient pas son propre état : le
 * parent passe les valeurs actuelles (modelValue) et reçoit chaque
 * changement, pour rester libre de les afficher en panneau (desktop)
 * ou dans une modale (mobile).
 */
// Props : la liste des catégories, "Autour de moi" actif ou non, et les valeurs des filtres.
const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },

  // Le rayon n'a de sens que si une position ("Autour de moi") est
  // active : masqué sinon, pour ne pas montrer un réglage sans effet.
  positionActive: {
    type: Boolean,
    default: false,
  },

  modelValue: {
    type: Object,
    default: () => ({ categorie: '', competence: '', ville: '', disponible: false, rayon_km: 10 }),
  },
})

// Événements : valeurs modifiées, appliquer, réinitialiser.
const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

// Change un seul filtre et envoie le nouvel objet complet au parent.
function set(champ, valeur) {
  emit('update:modelValue', { ...props.modelValue, [champ]: valeur })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Filtre : catégorie. -->
    <div>
      <label class="mb-1.5 block text-[12px] font-bold text-[#051F20]" for="filtre-categorie">
        Catégorie
      </label>
      <select
        id="filtre-categorie"
        :value="modelValue.categorie"
        class="w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#051F20] outline-none focus:border-[#2F6250] focus:ring-2 focus:ring-[#2F6250]/10"
        @change="set('categorie', $event.target.value)"
      >
        <option value="">Toutes les catégories</option>
        <option v-for="categorie in categories" :key="categorie.id" :value="categorie.nom">
          {{ categorie.nom }}
        </option>
      </select>
    </div>

    <!-- Filtre : compétence. -->
    <div>
      <label class="mb-1.5 block text-[12px] font-bold text-[#051F20]" for="filtre-competence">
        Compétence
      </label>
      <input
        id="filtre-competence"
        :value="modelValue.competence"
        type="text"
        placeholder="Ex. réparation fuite d'eau"
        class="w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#051F20] outline-none placeholder:text-[#94A3B8] focus:border-[#2F6250] focus:ring-2 focus:ring-[#2F6250]/10"
        @input="set('competence', $event.target.value)"
      />
    </div>

    <!-- Filtre : ville. -->
    <div>
      <label class="mb-1.5 block text-[12px] font-bold text-[#051F20]" for="filtre-ville">
        Ville
      </label>
      <input
        id="filtre-ville"
        :value="modelValue.ville"
        type="text"
        placeholder="Ex. Dakar"
        class="w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#051F20] outline-none placeholder:text-[#94A3B8] focus:border-[#2F6250] focus:ring-2 focus:ring-[#2F6250]/10"
        @input="set('ville', $event.target.value)"
      />
    </div>

    <!-- Filtre : disponible uniquement. -->
    <label class="flex items-center gap-2.5 text-[13px] font-semibold text-[#051F20]">
      <input
        type="checkbox"
        :checked="modelValue.disponible"
        class="h-4 w-4 shrink-0 rounded border-[#E2E8F0] text-[#2F6250] focus:ring-[#2F6250]/30"
        @change="set('disponible', $event.target.checked)"
      />
      Uniquement les prestataires disponibles
    </label>

    <!-- Filtre : rayon (seulement si "Autour de moi" est actif). -->
    <div v-if="positionActive">
      <label class="mb-1.5 block text-[12px] font-bold text-[#051F20]" for="filtre-rayon">
        Rayon de recherche
      </label>
      <select
        id="filtre-rayon"
        :value="modelValue.rayon_km"
        class="w-full rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#051F20] outline-none focus:border-[#2F6250] focus:ring-2 focus:ring-[#2F6250]/10"
        @change="set('rayon_km', Number($event.target.value))"
      >
        <option :value="5">5 km</option>
        <option :value="10">10 km</option>
        <option :value="20">20 km</option>
        <option :value="50">50 km</option>
      </select>
    </div>

    <!-- Boutons Appliquer / Réinitialiser. -->
    <div class="flex gap-2 pt-1">
      <button
        type="button"
        class="flex-1 rounded-[12px] bg-[#051F20] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#2F6250]"
        @click="emit('apply')"
      >
        Appliquer
      </button>
      <button
        type="button"
        class="rounded-[12px] border border-[#E2E8F0] px-4 py-2.5 text-[13px] font-bold text-[#051F20] transition hover:bg-[#F5F6F4]"
        @click="emit('reset')"
      >
        Réinitialiser
      </button>
    </div>
  </div>
</template>
