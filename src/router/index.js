import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/public/LandingPage.vue'
import LoginPage from '@/views/LoginPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import HomeClient from '@/views/client/HomeClient.vue'
import TrouverService from '@/views/client/TrouverService.vue'
import PrestataireProfil from '@/views/client/PrestataireProfil.vue'
import MesDemandes from '@/views/client/MesDemandes.vue'
import MesDevis from '@/views/client/MesDevis.vue'
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
    { path: '/client/services', name: 'trouver-service', component: TrouverService, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/prestataires/:id', name: 'client.prestataire', component: PrestataireProfil, props: true, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/demandes', name: 'demandes', component: MesDemandes, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/devis', name: 'client-devis', component: MesDevis, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/demandes/:id', name: 'detais.demande', component: DetailsDemandes, meta: { requiresAuth: true, roles: ['CLIENT'] } },
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
