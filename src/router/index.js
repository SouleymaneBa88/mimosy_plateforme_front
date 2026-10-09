// ------------------------------------------------------------------
// Le routeur : il associe chaque adresse (URL) à une page (vue).
// Exemple : "/login" affiche LoginPage.vue.
//
// meta.requiresAuth : il faut être connecté pour voir la page.
// meta.roles        : les rôles qui ont le droit de la voir.
// ------------------------------------------------------------------

// Outils de Vue Router pour créer le routeur.
import { createRouter, createWebHistory } from 'vue-router'
// Les pages chargées tout de suite (les plus utilisées).
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
// Le store de connexion (pour savoir si l'utilisateur est connecté).
import { useAuthStore } from '@/stores/auth'
// Fonctions qui vérifient les droits d'accès selon le rôle.
import { canAccessRoute, getHomeRouteName } from '@/config/navigator'

// On crée le routeur.
const router = createRouter({
  // Mode "history" : des URL propres, sans "#".
  history: createWebHistory(import.meta.env.BASE_URL),
  // La liste de toutes les routes de l'application.
  routes: [
    // Pages publiques (accessibles sans être connecté).
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/register', name: 'register', component: RegisterPage },
    // Confirmation de l'adresse e-mail (lien reçu par e-mail) et renvoi du lien.
    { path: '/verifier-email', name: 'verifier-email', component: () => import('@/views/VerifierEmail.vue') },
    // Pages du CLIENT.
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
    // Les pages avec "() => import(...)" sont chargées seulement quand on les ouvre
    // (chargement "paresseux") : le site démarre plus vite.
    { path: '/client/paiement/retour', name: 'client-paiement-retour', component: () => import('@/views/client/PaiementRetour.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/factures/:id', name: 'client-facture', component: () => import('@/views/client/Facture.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    { path: '/client/diagnostic', name: 'client-diagnostic', redirect: { name: 'client-home', query: { mimo: '1' } } },
    { path: '/client/litiges', name: 'client-litiges', component: () => import('@/views/client/MesLitiges.vue'), meta: { requiresAuth: true, roles: ['CLIENT'] } },
    // Messagerie : partagée entre clients et prestataires.
    { path: '/messages', name: 'messagerie', component: Messages, meta: { requiresAuth: true, roles: ['CLIENT', 'PRESTATAIRE'] } },
    { path: '/client/profil', name: 'profil-paramettre', component: ProfilParametre, meta: { requiresAuth: true, roles: ['CLIENT'] } },
    // Pages du PRESTATAIRE.
    { path: '/prestataire', name: 'prestataire-dashboard', component: () => import('@/views/prestataire/Dashboard.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/demandes', name: 'prestataire-demandes', component: () => import('@/views/prestataire/Demandes.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/devis', name: 'prestataire-devis', component: () => import('@/views/prestataire/DemandesDevis.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/rendez-vous', name: 'prestataire-rendez-vous', component: () => import('@/views/prestataire/RendezVous.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/services', name: 'prestataire-services', component: () => import('@/views/prestataire/Services.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/messages', name: 'prestataire-messages', component: () => import('@/views/prestataire/Messages.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/avis', name: 'prestataire-avis', component: () => import('@/views/prestataire/Avis.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/profil', name: 'prestataire-profil', component: () => import('@/views/prestataire/Profil.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'], avantValidation: true } },
    // Parcours « Vérifier mon profil professionnel » (profil, documents, cohérence, entretien IA).
    { path: '/prestataire/parcours', name: 'prestataire-parcours', component: () => import('@/views/prestataire/Parcours.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'], avantValidation: true } },
    // Ancienne page de vérification : remplacée par le parcours (lien conservé).
    { path: '/prestataire/verification', redirect: '/prestataire/parcours' },
    { path: '/prestataire/litiges', name: 'prestataire-litiges', component: () => import('@/views/prestataire/MesLitiges.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    { path: '/prestataire/wallet', name: 'prestataire-wallet', component: () => import('@/views/prestataire/Wallet.vue'), meta: { requiresAuth: true, roles: ['PRESTATAIRE'] } },
    // Pages de l'ADMINISTRATEUR.
    { path: '/admin', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/utilisateurs', name: 'admin-utilisateurs', component: () => import('@/views/admin/Utilisateurs.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/services', name: 'admin-services', component: () => import('@/views/admin/Services.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/demandes', name: 'admin-demandes', component: () => import('@/views/admin/Demandes.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/devis', name: 'admin-devis', component: () => import('@/views/admin/Devis.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/rendez-vous', name: 'admin-rendez-vous', component: () => import('@/views/admin/RendezVous.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/dossiers', name: 'admin-dossiers', component: () => import('@/views/admin/DossiersVerification.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/dossiers/:id', name: 'admin-dossier', component: () => import('@/views/admin/DossierVerification.vue'), props: true, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/verifications', name: 'admin-verifications', component: () => import('@/views/admin/Verifications.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/avis', name: 'admin-avis', component: () => import('@/views/admin/Avis.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/signalements', name: 'admin-signalements', component: () => import('@/views/admin/Signalements.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/litiges', name: 'admin-litiges', component: () => import('@/views/admin/Litiges.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/localisations', name: 'admin-localisations', component: () => import('@/views/admin/Localisations.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/paiements', name: 'admin-paiements', component: () => import('@/views/admin/Paiements.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
  ],
});

// Ce "garde" s'exécute avant CHAQUE changement de page.
router.beforeEach((to) => {
  const authStore = useAuthStore()
  // La page demandée exige-t-elle d'être connecté ?
  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)

  // Pas connecté : on envoie vers la page de connexion, en retenant où il voulait aller.
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Connecté mais adresse e-mail pas encore vérifiée : les espaces protégés
  // attendent la vérification (le backend refuse aussi les actions protégées).
  if (requiresAuth && authStore.emailNonVerifie) {
    return { name: 'verifier-email' }
  }

  // Prestataire pas encore validé : seules les pages du parcours (et ses
  // paramètres) sont accessibles ; le reste attend la décision de l'admin.
  if (requiresAuth && authStore.prestataireNonValide && !to.matched.some((route) => route.meta.avantValidation)) {
    return { name: 'prestataire-parcours' }
  }

  // Connecté mais pas le bon rôle : on renvoie vers sa propre page d'accueil.
  if (!canAccessRoute(to, authStore.role)) {
    return { name: getHomeRouteName(authStore.role) }
  }

  // Tout est bon : on laisse passer.
  return true
})

export default router;
