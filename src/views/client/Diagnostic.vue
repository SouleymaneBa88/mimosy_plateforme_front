<script setup>
/**
 * /client/diagnostic — parcours Mimo (remplace l'ancien formulaire de
 * diagnostic : une seule porte d'entrée intelligente, pas deux parcours
 * concurrents). La route et le lien du menu restent les mêmes.
 *
 * Mimo qualifie le besoin et oriente ; la recherche des prestataires reste
 * celle de MIMOSY (Prestataires.vue, /api/recherche/), et c'est toujours le
 * client qui envoie sa demande, depuis le profil d'un prestataire.
 */
import { ArrowLeft } from 'lucide-vue-next'

import ClientLayout from '@/components/layout/ClientLayout.vue'
import MimoAssistant from '@/components/client/MimoAssistant.vue'
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <router-link :to="{ name: 'client-home' }" class="flex items-center gap-1.5 font-sans text-sm font-medium text-mimosy-secondary transition hover:text-mimosy-text">
        <ArrowLeft :size="16" :stroke-width="1.8" />
        Retour à l'accueil
      </router-link>

      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Parler à Mimo</h1>
        <p class="font-sans text-sm text-mimosy-secondary">
          Décrivez votre problème avec vos mots. Mimo vous pose une ou deux questions, puis vous oriente vers les bons professionnels.
        </p>
      </div>

      <MimoAssistant />
    </div>
  </ClientLayout>
</template>
