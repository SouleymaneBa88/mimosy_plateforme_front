/**
 * Appels API du back-office admin.
 *
 * Volontairement regroupés dans un seul fichier plutôt que dispersés
 * (un fichier par domaine existe déjà côté métier : verificationService,
 * walletService...) : l'admin ne fait ici que lire des files d'attente
 * et prendre des décisions, jamais de logique métier propre — pas
 * besoin d'un store Pinia dédié, chaque page charge et affiche l'état
 * qu'elle montre, sans état partagé entre écrans.
 */
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

// Construit une chaîne de requête en ignorant les valeurs vides, pour ne
// jamais envoyer un filtre "statut=" ou "recherche=" vide au backend.
function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([cle, valeur]) => {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      query.set(cle, valeur)
    }
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

// Vérifications d'identité.
export const listDocumentsAVerifier = () => apiFetch(`${API_ENDPOINTS.adminDocuments}?statut=A_VERIFIER`)
export const listTousLesDocuments = () => apiFetch(API_ENDPOINTS.adminDocuments)
export const validerDocument = (id) => apiFetch(API_ENDPOINTS.adminDocumentValider(id), { method: 'POST' })
export const rejeterDocument = (id, motif) =>
  apiFetch(API_ENDPOINTS.adminDocumentRejeter(id), { method: 'POST', body: { motif } })

// Image du document, servie uniquement au propriétaire et aux admins
// (DocumentIdentiteFichierView). apiFetch ne lit que du JSON : même
// approche que disputeService.recupererApercuPreuve — requête authentifiée,
// puis URL locale en mémoire que l'appelant doit révoquer
// (URL.revokeObjectURL) dès qu'elle n'est plus affichée.
export async function recupererFichierDocument(id) {
  const token = localStorage.getItem('mimosy_access_token')
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.verificationDocumentFichier(id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    const messages = {
      401: 'Session expirée : rechargez la page pour afficher le document.',
      403: "Vous n'avez pas accès à ce document.",
      404: 'Aucun fichier associé à ce document.',
    }
    const error = new Error(messages[response.status] || "Impossible d'afficher le document.")
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

// Modération des avis.
export const listAvisEnAttente = () => apiFetch(`${API_ENDPOINTS.adminAvis}?statut=EN_ATTENTE`)
export const listTousLesAvis = () => apiFetch(API_ENDPOINTS.adminAvis)
export const approuverAvis = (id) => apiFetch(API_ENDPOINTS.adminAvisApprouver(id), { method: 'POST' })
export const bloquerAvis = (id) => apiFetch(API_ENDPOINTS.adminAvisBloquer(id), { method: 'POST' })

// Finance.
export const listPaiements = (statut) =>
  apiFetch(statut ? `${API_ENDPOINTS.adminPaiements}?statut=${statut}` : API_ENDPOINTS.adminPaiements)
export const listRetraits = (statut) =>
  apiFetch(statut ? `${API_ENDPOINTS.adminRetraits}?statut=${statut}` : API_ENDPOINTS.adminRetraits)
export const listTransactions = () => apiFetch(API_ENDPOINTS.adminTransactions)

// Dashboard et activité récente (données réelles, voir apps.adminpanel).
export const getDashboardStats = () => apiFetch(API_ENDPOINTS.adminDashboard)
export const getActiviteRecente = (limite = 15) => apiFetch(`${API_ENDPOINTS.adminActivite}${buildQuery({ limite })}`)

// Utilisateurs.
export const listUtilisateurs = (params) => apiFetch(`${API_ENDPOINTS.adminUtilisateurs}${buildQuery(params)}`)
export const changerStatutUtilisateur = (id, isActive) =>
  apiFetch(API_ENDPOINTS.adminUtilisateurStatut(id), { method: 'POST', body: { is_active: isActive } })

// Clients et prestataires.
export const listClientsAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminClients}${buildQuery(params)}`)
export const listPrestatairesAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminPrestataires}${buildQuery(params)}`)

// Demandes, devis, rendez-vous.
export const listDemandesAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminDemandes}${buildQuery(params)}`)
export const listDevisAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminDevis}${buildQuery(params)}`)
export const listRendezVousAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminRendezVous}${buildQuery(params)}`)

// Localisations (carte admin).
export const listLocalisationsAdmin = (params) => apiFetch(`${API_ENDPOINTS.adminLocalisations}${buildQuery(params)}`)

// Signalements.
export const listSignalements = (params) => apiFetch(`${API_ENDPOINTS.signalements}${buildQuery(params)}`)
export const prendreEnChargeSignalement = (id) =>
  apiFetch(API_ENDPOINTS.signalementPrendreEnCharge(id), { method: 'POST' })
export const traiterSignalement = (id, noteResolution) =>
  apiFetch(API_ENDPOINTS.signalementTraiter(id), { method: 'POST', body: { note_resolution: noteResolution } })
export const rejeterSignalement = (id, noteResolution) =>
  apiFetch(API_ENDPOINTS.signalementRejeter(id), { method: 'POST', body: { note_resolution: noteResolution } })

// Litiges.
export const listLitiges = (params) => apiFetch(`${API_ENDPOINTS.litiges}${buildQuery(params)}`)
export const getLitige = (id) => apiFetch(API_ENDPOINTS.litige(id))
export const getAnalyseLitige = (id) => apiFetch(API_ENDPOINTS.litigeAnalyse(id))
export const prendreEnChargeLitige = (id) => apiFetch(API_ENDPOINTS.litigePrendreEnCharge(id), { method: 'POST' })
export const resoudreLitige = (id, decisionAdmin) =>
  apiFetch(API_ENDPOINTS.litigeResoudre(id), { method: 'POST', body: { decision_admin: decisionAdmin } })
export const rejeterLitige = (id, decisionAdmin) =>
  apiFetch(API_ENDPOINTS.litigeRejeter(id), { method: 'POST', body: { decision_admin: decisionAdmin } })
export const demanderRepriseLitige = (id, decisionAdmin) =>
  apiFetch(API_ENDPOINTS.litigeDemanderReprise(id), { method: 'POST', body: { decision_admin: decisionAdmin } })
export const reattribuerLitige = (id, nouveauPrestataireId) =>
  apiFetch(API_ENDPOINTS.litigeReattribuer(id), { method: 'POST', body: { nouveau_prestataire: nouveauPrestataireId } })

// Score de confiance prestataire.
export const getScoreConfiance = (prestataireId) => apiFetch(API_ENDPOINTS.adminPrestataireScoreConfiance(prestataireId))
