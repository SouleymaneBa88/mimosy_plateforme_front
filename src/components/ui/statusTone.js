/**
 * Correspondance statut backend → ton visuel de MBadge.
 *
 * Présentation uniquement : les libellés métier restent ceux des pages et
 * de utils/verification.js. Un statut inconnu retombe sur « neutral »
 * plutôt que d'être deviné.
 */
const TONS = {
  success: [
    'VALIDE', 'VERIFIE', 'ACCEPTE', 'ACCEPTEE', 'CONFIRME', 'TERMINE', 'TERMINEE',
    'REUSSI', 'VERSE', 'RESOLU', 'PUBLIE', 'ACTIVE', 'TRAITE', 'REPRISE_EFFECTUEE',
  ],
  warning: [
    'EN_ATTENTE', 'EN_ANALYSE', 'A_VERIFIER', 'INITIE', 'REPRISE_DEMANDEE', 'BLOQUE', 'LITIGE',
    'REALISEE',
  ],
  danger: [
    'REJETE', 'REFUSE', 'REFUSEE', 'ECHOUE', 'EXPIRE', 'EXPIREE', 'DELAI_EXPIRE',
  ],
  info: ['EN_COURS', 'REATTRIBUE', 'REMBOURSE'],
  neutral: ['NON_SOUMIS', 'ANNULE', 'ANNULEE', 'INACTIVE'],
}

const INDEX = Object.fromEntries(
  Object.entries(TONS).flatMap(([ton, statuts]) => statuts.map((statut) => [statut, ton])),
)

export function toneForStatus(statut) {
  return INDEX[String(statut || '').toUpperCase()] || 'neutral'
}

// Libellés de secours accentués pour les codes connus ; la page reste libre
// de fournir le sien (prop `label` de MBadge).
const LIBELLES = {
  EN_ATTENTE: 'En attente', EN_ANALYSE: 'En analyse', A_VERIFIER: 'À vérifier',
  VALIDE: 'Validé', VERIFIE: 'Vérifié', ACCEPTE: 'Accepté', ACCEPTEE: 'Acceptée',
  CONFIRME: 'Confirmé', TERMINE: 'Terminé', TERMINEE: 'Terminée', REUSSI: 'Réussi',
  VERSE: 'Versé', RESOLU: 'Résolu', PUBLIE: 'Publié', TRAITE: 'Traité',
  REJETE: 'Rejeté', REFUSE: 'Refusé', REFUSEE: 'Refusée', ECHOUE: 'Échoué',
  EXPIRE: 'Expiré', EXPIREE: 'Expirée', DELAI_EXPIRE: 'Délai expiré',
  ANNULE: 'Annulé', ANNULEE: 'Annulée', NON_SOUMIS: 'Non soumis', INITIE: 'Initié',
  BLOQUE: 'Bloqué', REATTRIBUE: 'Réattribué', REMBOURSE: 'Remboursé',
  REPRISE_DEMANDEE: 'Reprise demandée', REPRISE_EFFECTUEE: 'Reprise effectuée',
  REALISEE: 'Validation en attente',
}

// « EN_ATTENTE » → « En attente » : libellé de secours quand la page n'en
// fournit pas.
export function humanizeStatus(statut) {
  const code = String(statut || '').toUpperCase()
  if (LIBELLES[code]) return LIBELLES[code]
  const texte = String(statut || '').replace(/_/g, ' ').toLowerCase()
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
