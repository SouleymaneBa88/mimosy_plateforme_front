/**
 * Configuration unique de l'API Django utilisée par les services frontend.
 */
// L'adresse du serveur. On la lit dans le fichier .env (VITE_API_BASE_URL),
// sinon on utilise localhost:8000. On enlève le "/" final.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

// La liste de toutes les adresses de l'API.
// Les fonctions (ex. provider(id)) construisent une adresse avec un identifiant.
export const API_ENDPOINTS = {
  // Authentification (connexion, inscription, profil).
  auth: {
    login: '/api/auth/login/',
    register: '/api/auth/register/',
    refresh: '/api/auth/token/refresh/',
    logout: '/api/auth/logout/',
    // Confirmation de l'adresse e-mail (lien reçu par e-mail) et renvoi du lien.
    verifyEmail: '/api/auth/verify-email/',
    resendVerificationEmail: '/api/auth/resend-verification-email/',
    profile: '/api/auth/profile/',
    profilePhoto: '/api/auth/profile/photo/',
  },
  // Catalogue, recherche et prestataires.
  location: '/api/location/',
  categories: '/api/categories/',
  services: '/api/services/',
  search: '/api/recherche/',
  searchIntelligente: '/api/recherche/intelligente/',
  serviceOffers: (id) => `/api/services/${id}/prestataires/`,
  providerOffers: '/api/prestataire-services/',
  providers: '/api/prestataires/',
  provider: (id) => `/api/prestataires/${id}/`,
  providerProfile: '/api/profil/prestataire/',
  // Avis.
  reviews: '/api/avis/',
  review: (id) => `/api/avis/${id}/`,
  // Demandes de prestation et actions possibles dessus.
  requests: '/api/demande-prestation/',
  request: (id) => `/api/demande-prestation/${id}/`,
  cancelRequest: (id) => `/api/demande-prestation/${id}/annuler/`,
  acceptRequest: (id) => `/api/demande-prestation/${id}/accepter/`,
  rejectRequest: (id) => `/api/demande-prestation/${id}/refuser/`,
  completeRequest: (id) => `/api/demande-prestation/${id}/terminer/`,
  confirmRequest: (id) => `/api/demande-prestation/${id}/confirmer/`,
  // Devis.
  quoteRequests: '/api/demandes/',
  quoteResponses: '/api/reponses/',
  acceptQuoteResponse: (id) => `/api/reponses/${id}/accepter/`,
  refuseQuoteResponse: (id) => `/api/reponses/${id}/refuser/`,
  // Disponibilités et rendez-vous.
  disponibilites: '/api/disponibilites/',
  disponibilite: (id) => `/api/disponibilites/${id}/`,
  providerDisponibilites: (prestataireId) => `/api/prestataires/${prestataireId}/disponibilites/`,
  providerCreneauxDisponibles: (prestataireId) => `/api/prestataires/${prestataireId}/creneaux-disponibles/`,
  rendezVous: '/api/rendez-vous/',
  rendezVousDetail: (id) => `/api/rendez-vous/${id}/`,
  confirmRendezVous: (id) => `/api/rendez-vous/${id}/confirmer/`,
  refuseRendezVous: (id) => `/api/rendez-vous/${id}/refuser/`,
  cancelRendezVous: (id) => `/api/rendez-vous/${id}/annuler/`,
  completeRendezVous: (id) => `/api/rendez-vous/${id}/terminer/`,
  // Vérification d'identité.
  verificationDocument: '/api/verification/document/',
  verificationDocuments: '/api/verification/documents/',
  verificationDocumentFichier: (id) => `/api/verification/document/${id}/fichier/`,
  // Parcours « Vérifier mon profil professionnel ».
  parcours: '/api/verification/parcours/',
  // Tableau de bord du prestataire connecté (statistiques agrégées par le serveur).
  monTableauDeBord: '/api/profil/prestataire/tableau-de-bord/',
  parcoursAssistant: '/api/verification/parcours/assistant/',
  // Langue de communication avec Aby et Fassa (fr, en, wo).
  parcoursLangue: '/api/verification/parcours/langue/',
  parcoursCoherence: '/api/verification/parcours/coherence/',
  parcoursSoumettre: '/api/verification/parcours/soumettre/',
  parcoursEntretien: '/api/verification/parcours/entretien/',
  parcoursEntretienReponse: (id) => `/api/verification/parcours/entretien/${id}/reponse/`,
  parcoursEntretienCommencer: (id) => `/api/verification/parcours/entretien/${id}/commencer/`,
  parcoursVoix: '/api/verification/parcours/voix/',
  parcoursTranscrire: '/api/verification/parcours/transcrire/',
  adminDossierRegenererSynthese: (id) => `/api/verification/admin/dossiers/${id}/regenerer-synthese/`,
  parcoursEntretienTerminer: (id) => `/api/verification/parcours/entretien/${id}/terminer/`,
  entretienEnregistrement: (id) => `/api/verification/entretiens/${id}/enregistrement/`,
  adminDossiers: '/api/verification/admin/dossiers/',
  adminDossiersCompteurs: '/api/verification/admin/dossiers/compteurs/',
  adminDossier: (id) => `/api/verification/admin/dossiers/${id}/`,
  adminDossierDecision: (id) => `/api/verification/admin/dossiers/${id}/decision/`,
  // Portefeuille (wallet) et paiements.
  monWallet: '/api/wallet/mon-wallet/',
  mesTransactions: '/api/wallet/mes-transactions/',
  mesRetraits: '/api/wallet/mes-retraits/',
  mesPaiements: '/api/wallet/mes-paiements/',
  statutPaiement: (id) => `/api/wallet/mes-paiements/${id}/statut/`,
  facturePaiement: (id) => `/api/wallet/mes-paiements/${id}/facture/`,
  // Ticket de connexion WebSocket (temps réel), voir services/realtime.js.
  wsTicket: '/api/ws/ticket/',
  // Espace administrateur.
  adminDocuments: '/api/verification/admin/documents/',
  adminDocumentValider: (id) => `/api/verification/admin/documents/${id}/valider/`,
  adminDocumentRejeter: (id) => `/api/verification/admin/documents/${id}/rejeter/`,
  adminAvis: '/api/avis/',
  adminAvisApprouver: (id) => `/api/avis/${id}/approuver/`,
  adminAvisBloquer: (id) => `/api/avis/${id}/bloquer/`,
  adminPaiements: '/api/wallet/admin/paiements/',
  adminRetraits: '/api/wallet/admin/retraits/',
  adminTransactions: '/api/wallet/admin/transactions/',
  adminDashboard: '/api/admin/dashboard/',
  adminDashboardTendances: '/api/admin/dashboard/tendances/',
  adminActivite: '/api/admin/activite/',
  adminUtilisateurs: '/api/admin/utilisateurs/',
  adminUtilisateurStatut: (id) => `/api/admin/utilisateurs/${id}/statut/`,
  adminClients: '/api/admin/clients/',
  adminPrestataires: '/api/admin/prestataires/',
  adminDemandes: '/api/admin/demandes/',
  adminDevis: '/api/admin/devis/',
  adminRendezVous: '/api/admin/rendez-vous/',
  adminLocalisations: '/api/admin/localisations/',
  adminPrestataireScoreConfiance: (id) => `/api/admin/prestataires/${id}/score-confiance/`,
  // Signalements.
  signalements: '/api/signalements/',
  signalementPrendreEnCharge: (id) => `/api/signalements/${id}/prendre_en_charge/`,
  signalementTraiter: (id) => `/api/signalements/${id}/traiter/`,
  signalementRejeter: (id) => `/api/signalements/${id}/rejeter/`,
  // Litiges.
  litiges: '/api/litiges/',
  litige: (id) => `/api/litiges/${id}/`,
  litigeAjouterPreuve: (id) => `/api/litiges/${id}/preuves/`,
  litigePreuveFichier: (id) => `/api/litiges/preuves/${id}/fichier/`,
  litigeAnalyse: (id) => `/api/litiges/${id}/analyse/`,
  litigePrendreEnCharge: (id) => `/api/litiges/${id}/prendre_en_charge/`,
  litigeResoudre: (id) => `/api/litiges/${id}/resoudre/`,
  litigeRejeter: (id) => `/api/litiges/${id}/rejeter/`,
  litigeDemanderReprise: (id) => `/api/litiges/${id}/demander-reprise/`,
  litigeConfirmerReprise: (id) => `/api/litiges/${id}/confirmer-reprise/`,
  litigeReattribuer: (id) => `/api/litiges/${id}/reattribuer/`,
  // Divers : diagnostic, catalogue, notifications, messagerie.
  diagnostic: '/api/diagnostic/',
  category: (id) => `/api/categories/${id}/`,
  service: (id) => `/api/services/${id}/`,
  notifications: '/api/notifications/',
  readNotification: (id) => `/api/notifications/${id}/marquer-lue/`,
  readAllNotifications: '/api/notifications/marquer-toutes-lues/',
  messages: '/api/messages/',
  message: (id) => `/api/messages/${id}/`,
}
