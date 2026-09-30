<!--
  Page "Messages" du prestataire.
  Elle place simplement l'espace de messagerie commun (MessagingWorkspace)
  dans la mise en page du prestataire (AppLayout).
-->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import MessagingWorkspace from '@/components/messages/MessagingWorkspace.vue'
</script>
<template>
<AppLayout role="prestataire" background="#F2F3F0">
    <MessagingWorkspace role="prestataire" />
    </AppLayout>
    </template>
