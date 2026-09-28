<script setup>
import { onMounted } from 'vue'

import AppSidebar from '@/components/layout/AppSidebar.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import HeaderPrestataire from '@/components/prestataire/HeaderPrestataire.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useRealtimeStore } from '@/stores/realtime'

const props = defineProps({
  role: {
    type: String,
    default: 'client',
  },
  // Permet à une page de remplacer le fond crème par défaut (ex: le gris
  // MIMOSY utilisé par certaines pages PRESTATAIRE) sans dupliquer un
  // conteneur de fond par page : le fond couvre alors vraiment toute la
  // page (hauteur + largeur), pas seulement la zone de contenu.
  background: {
    type: String,
    default: '',
  },
})

const clientProfilStore = useClientProfilStore()

onMounted(() => {
  // Connexion temps réel : une seule par onglet (sans effet si déjà ouverte).
  useRealtimeStore().demarrer()
  if (!clientProfilStore.isLoaded && localStorage.getItem('mimosy_access_token')) {
    clientProfilStore.chargerProfil().catch(() => {})
  }
})
</script>

<template>
  <div class="min-h-screen" :style="{ backgroundColor: props.background || 'var(--pp-bg, #FFFDF9)' }" >
    <AppSidebar :role="props.role" />

    <!--
      Décalage aligné sur AppSidebar.vue : sur mobile/tablette (<lg), la
      sidebar est une barre fixe de h-16 en haut (pas de décalage à
      gauche) ; à partir de lg, elle devient une colonne fixe de w-[260px]
      à gauche (plus de barre du haut). L'ancien décalage pl-[76px]/280px
      correspondait à une sidebar repliée en icônes qui n'existe plus.
    -->
    <main class="min-h-screen pt-16 transition-[padding] duration-300 ease-out lg:pt-0 lg:pl-[260px]">
      <!--
        En-tête plein-bord : rendu une seule fois ici (pas par chaque page
        PRESTATAIRE) pour éviter la répétition et l'oubli constatés quand
        chaque vue devait l'inclure elle-même. Rendu hors du conteneur
        padded ci-dessous pour qu'il touche vraiment les bords, sans le
        double espace blanc que produirait le padding appliqué au reste du
        contenu.
      -->
      <HeaderPrestataire v-if="props.role === 'prestataire'" />

      <div class="mx-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 lg:px-10 lg:py-10 xl:px-12">
        <slot />
      </div>
    </main>

    <ToastContainer />
  </div>
</template>