<script setup>
/**
 * Layout du CLIENT : navigation horizontale (ClientNavbar) au lieu de la
 * sidebar verticale (AppSidebar) utilisée par PRESTATAIRE/ADMIN. AppLayout
 * reste inchangé et continue de servir ces deux autres rôles.
 */
import { onMounted } from 'vue'

import ClientNavbar from '@/components/layout/ClientNavbar.vue'
import ClientFooter from '@/components/layout/ClientFooter.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import { useRealtimeStore } from '@/stores/realtime'

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
  <div class="min-h-screen bg-mimosy-page">
    <ClientNavbar />

    <!--
      Pas de padding/max-width ici : comme dans front_mimosy/Layout/ClientLayout.vue,
      chaque vue gère son propre conteneur avec l'une des deux grilles communes :
        - "standard"  : mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-8 sm:py-12
                        (pages liste/détail/formulaire : Demandes, Devis, Litiges,
                        Profil, détail demande, détail prestataire, Rendez-vous,
                        Diagnostic, Paiement retour)
        - "large"     : w-full px-4 py-10 sm:px-8 sm:py-12 (sans max-width : Accueil,
                        qui a besoin de toute la largeur pour cartes + carte géo)
      Gap interne standard entre sections d'une page : gap-6 sm:gap-8.
    -->
    <main>
      <slot />
    </main>

    <ClientFooter />

    <ToastContainer />
  </div>
</template>
