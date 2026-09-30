<!--
  Loader : petit cercle qui tourne pendant un chargement.
  Le texte "Chargement..." est caché à l'écran mais lu par les lecteurs d'écran.
-->
<template>
  <div class="flex items-center justify-center p-8" role="status" aria-live="polite">
    <span class="h-8 w-8 animate-spin rounded-full border-4 border-[#D9DDD8] border-t-[#2F6250]"></span>
    <span class="sr-only">Chargement...</span>
  </div>
</template>
