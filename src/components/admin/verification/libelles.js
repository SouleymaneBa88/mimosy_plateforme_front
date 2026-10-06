/**
 * Libellés et tons partagés par les écrans de vérification admin.
 * Les valeurs viennent des modèles Django (DossierVerification.Statut,
 * DocumentIdentite.Statut, types d'EvenementDossier) : aucune autre valeur
 * n'est affichée.
 */
import {
  Bot,
  CircleCheck,
  CircleX,
  FileText,
  Gavel,
  Mic,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  UserPen,
} from 'lucide-vue-next'

export const TONS_DOSSIER = {
  PROFIL_A_COMPLETER: 'neutral',
  DOCUMENTS_A_FOURNIR: 'neutral',
  DOCUMENTS_EN_ANALYSE: 'info',
  COHERENCE_A_VERIFIER: 'info',
  ENTRETIEN_A_FAIRE: 'info',
  ENTRETIEN_TERMINE: 'info',
  DOSSIER_EN_REVUE: 'warning',
  A_VERIFIER: 'info',
  VALIDE: 'success',
  REJETE: 'danger',
}

export const TONS_DOCUMENT = {
  EN_ANALYSE: 'info',
  A_VERIFIER: 'warning',
  VALIDE: 'success',
  REJETE: 'danger',
  NON_SOUMIS: 'neutral',
}

export const LIBELLES_STATUT_PRESTATAIRE = {
  EN_ATTENTE: 'En attente de vérification',
  VERIFIE: 'Prestataire vérifié',
  REJETE: 'Prestataire rejeté',
}
export const TONS_STATUT_PRESTATAIRE = { EN_ATTENTE: 'warning', VERIFIE: 'verified', REJETE: 'danger' }

export const LIBELLES_DECISION = {
  VALIDE: 'Validé',
  A_VERIFIER: 'Nouvelle vérification demandée',
  REJETE: 'Rejeté',
}

export const ETAPES_A_REPRENDRE = [
  { valeur: 'profil', libelle: 'Profil professionnel' },
  { valeur: 'identite', libelle: "Pièce d'identité" },
  { valeur: 'competences', libelle: 'Justificatif professionnel' },
  { valeur: 'entretien', libelle: 'Entretien' },
]

export const CHAMPS_IDENTITE = { nom: 'Nom', prenom: 'Prénom', date_naissance: 'Date de naissance' }

// Réponse « oui / non / indéterminé » d'une analyse IA → texte + ton.
export function correspondance(valeur) {
  if (valeur === true || valeur === 'oui') return { texte: 'Correspond', ton: 'success' }
  if (valeur === false || valeur === 'non') return { texte: 'Ne correspond pas', ton: 'danger' }
  return { texte: 'Indéterminé', ton: 'neutral' }
}

/*
 * Historique : chaque type d'événement appartient à une catégorie, qui
 * donne son icône, sa couleur et le filtre dans lequel il apparaît.
 *   soumission : action du prestataire
 *   analyse    : production d'une IA ou d'une règle automatique (aide)
 *   decision   : décision humaine d'un administrateur
 */
export const CATEGORIES_EVENEMENT = {
  soumission: { libelle: 'Prestataire', ton: 'neutral' },
  analyse: { libelle: 'Analyse automatique', ton: 'info' },
  decision: { libelle: 'Décision administrateur', ton: 'brand' },
}

const EVENEMENTS = {
  PROFIL: { titre: 'Profil professionnel complété', categorie: 'soumission', icone: UserPen },
  DOCUMENT_SOUMIS: { titre: 'Document soumis', categorie: 'soumission', icone: FileText },
  ANALYSE_DOCUMENT: { titre: 'Lecture automatique du document', categorie: 'analyse', icone: Sparkles },
  ANALYSE_ERREUR: { titre: 'Lecture automatique interrompue', categorie: 'analyse', icone: ShieldAlert },
  ANALYSE_IDENTITE: { titre: "Analyse IA de la pièce d'identité", categorie: 'analyse', icone: Bot },
  ANALYSE_COMPETENCE: { titre: 'Analyse IA du justificatif', categorie: 'analyse', icone: Bot },
  COHERENCE: { titre: 'Contrôle de cohérence', categorie: 'analyse', icone: Sparkles },
  ENTRETIEN_DEBUT: { titre: 'Entretien démarré', categorie: 'soumission', icone: Mic },
  ENTRETIEN_FIN: { titre: 'Entretien terminé · rapport IA', categorie: 'analyse', icone: Mic },
  SYNTHESE: { titre: 'Synthèse IA du dossier', categorie: 'analyse', icone: Bot },
  SYNTHESE_REGENEREE: { titre: 'Synthèse régénérée', categorie: 'analyse', icone: Bot },
  SOUMISSION: { titre: "Dossier transmis à l'administration", categorie: 'soumission', icone: Send },
  DOCUMENT_VALIDE: { titre: 'Document validé', categorie: 'decision', icone: CircleCheck },
  DOCUMENT_REJETE: { titre: 'Document rejeté', categorie: 'decision', icone: CircleX },
  DECISION_VALIDE: { titre: 'Dossier validé', categorie: 'decision', icone: Gavel },
  DECISION_A_VERIFIER: { titre: 'Nouvelle vérification demandée', categorie: 'decision', icone: RotateCcw },
  DECISION_REJETE: { titre: 'Dossier rejeté', categorie: 'decision', icone: Gavel },
}

export function evenement(type) {
  return EVENEMENTS[type] || { titre: type || 'Événement', categorie: 'soumission', icone: FileText }
}

export function dateHeure(valeur) {
  return valeur ? new Date(valeur).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export function dateCourte(valeur) {
  return valeur ? new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function initiales(nom) {
  return (nom || '?').trim().split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase() ?? '').join('')
}
