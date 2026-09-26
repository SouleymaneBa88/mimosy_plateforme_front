/** Wallet MIMOSY : solde prestataire, transactions, retraits, paiements client. */
import { API_ENDPOINTS } from '@/config/api'
import { apiFetch } from './api'

export const getMonWallet = () => apiFetch(API_ENDPOINTS.monWallet)
export const listMesTransactions = () => apiFetch(API_ENDPOINTS.mesTransactions)

export const listMesRetraits = () => apiFetch(API_ENDPOINTS.mesRetraits)
export const demanderRetrait = (payload) =>
  apiFetch(API_ENDPOINTS.mesRetraits, { method: 'POST', body: payload })

export const listMesPaiements = () => apiFetch(API_ENDPOINTS.mesPaiements)

/**
 * Initie une tentative de paiement pour une demande.
 *
 * La clé d'idempotence est générée une fois par APPEL (donc une fois
 * par clic de l'utilisateur sur "Payer"/"Réessayer"), jamais dérivée
 * uniquement de demandePrestationId : le backend autorise plusieurs
 * tentatives sur la même demande (une première échouée, une seconde
 * réussie — voir apps.wallet.services.initier_paiement et
 * test_nouvelle_tentative_possible_apres_un_echec), et il distingue
 * ces tentatives par leur idempotency_key. Une clé stable par demande
 * ferait que la deuxième tentative renverrait simplement le même
 * paiement ECHOUE au lieu d'en retenter un nouveau.
 */
export const payerDemande = (demandePrestationId, { moyen_paiement, telephone }) =>
  apiFetch(API_ENDPOINTS.mesPaiements, {
    method: 'POST',
    body: {
      demande_prestation: demandePrestationId,
      // Choix faits dans la modal de paiement. Jamais de montant : le
      // backend le lit dans la demande.
      moyen_paiement,
      telephone,
      idempotency_key: `paiement-${demandePrestationId}-${crypto.randomUUID()}`,
    },
  })

/**
 * Vérifie le statut réel d'un paiement auprès du backend, qui
 * l'interroge lui-même auprès de PayDunya si le paiement est encore
 * en attente (voir apps.wallet.services.verifier_statut_paiement).
 * Utilisé quand le client revient de la page de paiement PayDunya :
 * on n'affiche jamais "paiement réussi" sur la seule foi du retour de
 * redirection, uniquement sur ce que cet endpoint renvoie.
 */
export const getStatutPaiement = (paiementId) => apiFetch(API_ENDPOINTS.statutPaiement(paiementId))
