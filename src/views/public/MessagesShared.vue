<script setup>
import ClientLayout from '@/components/layout/ClientLayout.vue'
import MessagingWorkspace from '@/components/messages/MessagingWorkspace.vue'
</script>
<template>
  <ClientLayout>
    <!-- Mêmes marges horizontales que les autres pages (grille commune),
         padding vertical réduit : la messagerie a besoin du maximum de
         hauteur utile (voir h-[calc(...)] dans MessagingWorkspace.vue). -->
    <div class="mx-auto w-full max-w-[100%] px-4 py-6 sm:px-8 sm:py-8">
      <MessagingWorkspace role="client" />
    </div>
  </ClientLayout>
</template>
