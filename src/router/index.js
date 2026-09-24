import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/public/LandingPage.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import HomeClient from '@/views/client/HomeClient.vue'
import Prestataires from '@/views/client/Prestataires.vue'
import PrestataireProfil from '@/views/client/PrestataireProfil.vue'
import MesDemandes from '@/views/client/MesDemandes.vue'
import MesDevis from '@/views/client/MesDevis.vue'
import MesRendezVous from '@/views/client/MesRendezVous.vue'
import DetailsDemandes from '@/views/client/DetailsDemandes.vue'
import Messages from '@/views/public/MessagesShared.vue'
import ProfilParametre from '@/views/client/profilParametre.vue'
import { useAuthStore } from '@/stores/auth'
import { canAccessRoute, getHomeRouteName } from '@/config/navigator'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/register', name: 'register', component: RegisterPage },
    { path: '/client', name: 'client-home', component: HomeClient, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    // Ancienne page "Trouver un service" : remplacée par Prestataires.vue,
    // qui partage le même moteur de recherche que l'accueil (voir
    // composables/useRecherchePrestataires.js). L'URL reste valide
    // (redirection) pour ne pas casser un lien/favori existant.
    { path: '/client/services', redirect: '/client/prestataires' },
    { path: '/client/prestataires', name: 'client-prestataires', component: Prestataires, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/prestataires/:id', name: 'client.prestataire', component: PrestataireProfil, props: true, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/demandes', name: 'demandes', component: MesDemandes, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/devis', name: 'client-devis', component: MesDevis, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/rendez-vous', name: 'client-rendez-vous', component: MesRendezVous, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/demandes/:id', name: 'detais.demande', component: DetailsDemandes, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/paiement/retour', name: 'client-paiement-retour', component: () => import('@/views/client/PaiementRetour.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/diagnostic', name: 'client-diagnostic', component: () => import('@/views/client/Diagnostic.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/litiges', name: 'client-litiges', component: () => import('@/views/client/MesLitiges.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/messages', name: 'messagerie', component: Messages, meta: { requiresAuth: true, roles: ['CLIENT', 'PRESTATAIRE'] } },
    { path: '/client/profil', name: 'profil-paramettre', component: ProfilParametre, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/prestataire', name: 'prestataire-dashboard', component: () => import('@/views/prestataire/Dashboard.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/demandes', name: 'prestataire-demandes', component: () => import('@/views/prestataire/Demandes.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/devis', name: 'prestataire-devis', component: () => import('@/views/prestataire/DemandesDevis.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/rendez-vous', name: 'prestataire-rendez-vous', component: () => import('@/views/prestataire/RendezVous.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/services', name: 'prestataire-services', component: () => import('@/views/prestataire/Services.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/messages', name: 'prestataire-messages', component: () => import('@/views/prestataire/Messages.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/avis', name: 'prestataire-avis', component: () => import('@/views/prestataire/Avis.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/profil', name: 'prestataire-profil', component: () => import('@/views/prestataire/Profil.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/verification', name: 'prestataire-verification', component: () => import('@/views/prestataire/Verification.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/litiges', name: 'prestataire-litiges', component: () => import('@/views/prestataire/MesLitiges.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/wallet', name: 'prestataire-wallet', component: () => import('@/views/prestataire/Wallet.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/admin', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/utilisateurs', name: 'admin-utilisateurs', component: () => import('@/views/admin/Utilisateurs.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/services', name: 'admin-services', component: () => import('@/views/admin/Services.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/demandes', name: 'admin-demandes', component: () => import('@/views/admin/Demandes.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/devis', name: 'admin-devis', component: () => import('@/views/admin/Devis.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/rendez-vous', name: 'admin-rendez-vous', component: () => import('@/views/admin/RendezVous.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/verifications', name: 'admin-verifications', component: () => import('@/views/admin/Verifications.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/avis', name: 'admin-avis', component: () => import('@/views/admin/Avis.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/signalements', name: 'admin-signalements', component: () => import('@/views/admin/Signalements.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/litiges', name: 'admin-litiges', component: () => import('@/views/admin/Litiges.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/localisations', name: 'admin-localisations', component: () => import('@/views/admin/Localisations.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/paiements', name: 'admin-paiements', component: () => import('@/views/admin/Paiements.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!canAccessRoute(to, authStore.role)) {
    return { name: getHomeRouteName(authStore.role) }
  }

  return true
})

export default router;
