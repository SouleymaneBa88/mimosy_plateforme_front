<script setup>
/**
 * Bandeau de titre de page (pas une navigation) : notifications et avatar
 * ont été retirés d'ici car ils vivent désormais dans ClientNavbar.vue
 * (menu horizontal, affiché une seule fois pour toutes les pages CLIENT).
 */
import { computed } from 'vue'

import { useClientProfilStore } from '@/stores/clientProfil'

// Props : nom, titre, sous-titre, adresse (tous facultatifs).
const props = defineProps({
  userName: {
    type: String,
    default: '',
  },

  // Remplace le "Bonjour, {userName}" par défaut quand on a besoin d'un titre de page (ex: "Trouver un prestataire")
  title: {
    type: String,
    default: '',
  },

  // Remplace la ligne d'adresse par un texte libre (ex: un sous-titre d'accroche)
  subtitle: {
    type: String,
    default: '',
  },

  address: {
    type: String,
    default: '',
  },
})

// Le store du profil (pour afficher le nom du client).
const clientProfilStore = useClientProfilStore()

// Le header utilise le profil global, sauf si une page fournit explicitement une valeur.
const displayName = computed(() => props.userName || clientProfilStore.nomComplet)
</script>

<template>
  <header class="w-full">
    <!-- Le titre : celui fourni, sinon "Bonjour, <nom>". -->
    <h1 class="truncate text-[22px] font-extrabold leading-8 tracking-[0.03px] text-[#051F20] sm:text-[25px] sm:leading-9 lg:text-[28px] lg:leading-[42px]">
      {{ title || `Bonjour, ${displayName}` }}
    </h1>

    <!-- Le sous-titre, ou l'adresse. -->
    <p
      v-if="subtitle || address"
      class="mt-1 line-clamp-2 text-[13px] font-normal leading-5 text-[#64748B] sm:text-[14px] sm:leading-[21px]"
    >
      {{ subtitle || `Votre adresse : ${address}` }}
    </p>
  </header>
</template>
