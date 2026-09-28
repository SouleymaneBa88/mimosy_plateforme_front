/**
 * Règles d'affichage partagées entre la page de vérification du
 * prestataire et la file d'attente admin, pour rester exactement
 * cohérentes entre les deux écrans.
 *
 * Le seuil ci-dessous reproduit SEUIL_CORRESPONDANCE_CHAMP côté
 * backend (apps.verification.services) : un score en dessous signifie
 * qu'au moins un champ ne correspond probablement pas au profil.
 */
export const SEUIL_CORRESPONDANCE = 0.8

// Les cinq seuls statuts réellement renvoyés par l'API (voir
// DocumentIdentite.Statut côté backend) : aucun autre ne doit être
// affiché dans l'interface.
export const LABELS_STATUT_DOCUMENT = {
  NON_SOUMIS: 'Non soumis',
  EN_ANALYSE: 'Analyse en cours',
  A_VERIFIER: 'À vérifier par MIMOSY',
  VALIDE: 'Validé',
  REJETE: 'Refusé',
}

export const CLASSES_STATUT_DOCUMENT = {
  VALIDE: 'bg-[#EAF8F2] text-[#16805B]',
  REJETE: 'bg-[#FFF0EE] text-[#A85148]',
  EN_ANALYSE: 'bg-[#FFF7E6] text-[#9A723C]',
  A_VERIFIER: 'bg-[#FFF7E6] text-[#9A723C]',
  NON_SOUMIS: 'bg-[#F1F5F9] text-[#64748B]',
}

export const LABELS_CHAMP_COMPARAISON = {
  nom: 'Nom',
  prenom: 'Prénom',
  date_naissance: 'Date de naissance',
}

/**
 * Détermine l'état d'affichage d'un champ de comparaison.
 *
 * Distingue explicitement :
 *   - 'correspond'        : les deux valeurs existent et se ressemblent
 *   - 'ne_correspond_pas' : les deux valeurs existent mais diffèrent
 *   - 'non_lisible'       : l'OCR n'a pas pu lire le champ (document vaut null)
 *   - 'indisponible'      : la valeur du profil manque (comparaison impossible)
 *
 * Ne jamais afficher 'non_lisible' ou 'indisponible' pendant EN_ANALYSE :
 * l'analyse n'est pas encore terminée — voir analyseCourante().
 */
export function etatChampComparaison(champ) {
  if (!champ) return 'indisponible'

  const profilPresent  = champ.profil  != null && champ.profil  !== ''
  const documentPresent = champ.document != null && champ.document !== ''

  // Profil non renseigné : impossible de comparer, quelle que soit la CNI.
  if (!profilPresent) return 'indisponible'

  // Profil présent mais OCR n'a rien lu pour ce champ.
  if (!documentPresent) return 'non_lisible'

  // Les deux valeurs sont disponibles.
  return champ.correspond ? 'correspond' : 'ne_correspond_pas'
}

export const LABELS_ETAT_CHAMP = {
  correspond:         'Correspondance',
  ne_correspond_pas:  'Non-correspondance',
  non_lisible:        'Non lisible',
  indisponible:       'Non vérifiable',
}

export const CLASSES_ETAT_CHAMP = {
  correspond:         'bg-[#EAF8F2] text-[#16805B]',
  ne_correspond_pas:  'bg-[#FFF0EE] text-[#A85148]',
  non_lisible:        'bg-[#F1F5F9] text-[#64748B]',
  indisponible:       'bg-[#F1F5F9] text-[#64748B]',
}

/**
 * Traduit le score global en un niveau de confiance compréhensible.
 * Ne renvoie rien si aucune analyse n'a réellement produit de score
 * (IA désactivée ou document illisible) : on n'invente jamais un
 * niveau à partir d'une absence de données.
 */
export function niveauConfiance(score) {
  if (score == null) return null
  return score >= SEUIL_CORRESPONDANCE ? 'Élevé' : 'À vérifier'
}

/**
 * Indique si un document est actuellement en cours d'analyse.
 * Pendant cet état, les résultats OCR ne sont PAS encore disponibles :
 * il ne faut rien afficher des champs de comparaison.
 */
export function analyseCourante(document) {
  return document?.statut === 'EN_ANALYSE'
}

/**
 * Indique si l'analyse automatique a été effectuée sur ce document.
 *
 * Contrat backend (apps.verification.services.analyser_document) :
 * resultat_comparaison contient ocr_active / texte_lu / ocr_erreur.
 * Un document analysé avant l'ajout de ces clés n'a pas ocr_active : on
 * continue alors d'afficher ses résultats, comme auparavant.
 */
export function analyseEffectuee(document) {
  const resultat = document?.resultat_comparaison
  return (
    document?.statut === 'A_VERIFIER' &&
    resultat != null &&
    resultat.ocr_active !== false
  )
}

/**
 * Indique si l'IA était désactivée quand le document a été analysé.
 * Critère explicite : resultat_comparaison.ocr_active === false. Les
 * champs de comparaison, eux, existent même quand l'OCR n'a pas tourné
 * (tous vides) : ils ne permettent pas de le savoir.
 */
export function iaEtaitDesactivee(document) {
  return (
    document?.statut === 'A_VERIFIER' &&
    document?.resultat_comparaison?.ocr_active === false
  )
}

// Les cinq informations que l'OCR tente d'extraire d'une pièce d'identité
// (voir ChampsExtraits côté backend), dans l'ordre d'affichage.
export const CHAMPS_EXTRAITS = [
  { cle: 'nom', label: 'Nom' },
  { cle: 'prenom', label: 'Prénom' },
  { cle: 'date_naissance', label: 'Date de naissance', date: true, feminin: true },
  { cle: 'numero_document', label: 'Numéro de document' },
  { cle: 'date_expiration', label: "Date d'expiration", date: true, feminin: true },
]

/**
 * État de la lecture automatique d'une pièce d'identité, déduit
 * uniquement des indicateurs enregistrés par le backend :
 *   - 'en_cours'    : analyse pas encore terminée
 *   - 'non_analyse' : aucun résultat enregistré (type non analysé…)
 *   - 'inconnu'     : analysé avant l'ajout des indicateurs d'état
 *   - 'desactive'   : IA désactivée, aucune analyse réalisée
 *   - 'erreur'      : échec technique de l'OCR (≠ document illisible)
 *   - 'aucun_texte' : OCR exécuté, aucun texte exploitable
 *   - 'partiel'     : texte lu, certains champs non détectés
 *   - 'complet'     : texte lu, les cinq champs détectés
 * Ne dit rien de l'authenticité du document.
 */
export function etatAnalyseOcr(document) {
  if (analyseCourante(document)) return 'en_cours'

  const resultat = document?.resultat_comparaison
  if (resultat == null) return 'non_analyse'
  if (resultat.ocr_active === undefined) return 'inconnu'
  if (resultat.ocr_active === false) return 'desactive'
  if (resultat.ocr_erreur) return 'erreur'
  if (!resultat.texte_lu) return 'aucun_texte'

  const donnees = document.donnees_extraites || {}
  const tousDetectes = CHAMPS_EXTRAITS.every(({ cle }) => donnees[cle] != null && donnees[cle] !== '')
  return tousDetectes ? 'complet' : 'partiel'
}
