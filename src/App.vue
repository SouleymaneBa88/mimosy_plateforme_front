<!--
  App.vue : le composant racine de l'application.
  Il ne contient qu'un <RouterView /> : c'est l'emplacement où le routeur
  affiche la page correspondant à l'adresse actuelle.
-->
<script setup>
// RouterView = la zone où s'affiche la page choisie par le routeur.
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView />
</template>
