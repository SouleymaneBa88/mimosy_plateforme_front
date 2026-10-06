/**
 * Règles de saisie des comptes (inscription, renvoi du lien de confirmation).
 *
 * Elles AIDENT l'utilisateur (message immédiat, bouton désactivé) mais ne
 * protègent rien : le backend applique les mêmes règles
 * (back_Mimosy/apps/accounts/validators.py) et c'est lui qui décide.
 * Si les deux divergent, le backend gagne : ses messages s'affichent
 * sous le champ concerné (voir extraireErreursApi).
 *
 * Chaque fonction erreurXxx(valeur) renvoie "" si la valeur est valide,
 * sinon le message à afficher.
 */

export const NOM_LONGUEUR_MIN = 2
export const NOM_LONGUEUR_MAX = 50
export const EMAIL_LONGUEUR_MAX = 254
export const MOT_DE_PASSE_LONGUEUR_MIN = 8
export const MOT_DE_PASSE_LONGUEUR_MAX = 128
export const ROLES_INSCRIPTION = ['CLIENT', 'PRESTATAIRE']

// Lettres de toutes langues (accents compris), séparées par espace, apostrophe ou tiret.
const NOM_REGEX = /^\p{L}+(?:[ '-]\p{L}+)*$/u
// Trois lettres identiques à la suite (saisie au hasard : « aaa »).
const TRIPLE_LETTRE_REGEX = /(\p{L})\1\1/iu
// Format d'e-mail volontairement simple : le backend fait la vérification complète.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Mobile sénégalais : 70, 75, 76, 77 ou 78 + 7 chiffres.
const TELEPHONE_REGEX = /^(70|75|76|77|78)\d{7}$/

// Nom : espaces multiples réduits, ’ converti en ', espaces de bord retirés.
export function normaliserNom(valeur) {
  return String(valeur ?? '')
    .normalize('NFC')
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function erreurNom(valeur, libelle = 'Le nom') {
  const nom = normaliserNom(valeur)
  if (!nom) return `${libelle} est obligatoire.`
  if (nom.length < NOM_LONGUEUR_MIN) return `${libelle} doit contenir au moins ${NOM_LONGUEUR_MIN} caractères.`
  if (nom.length > NOM_LONGUEUR_MAX) return `${libelle} ne doit pas dépasser ${NOM_LONGUEUR_MAX} caractères.`
  if (!NOM_REGEX.test(nom)) {
    return `${libelle} ne peut contenir que des lettres, des espaces, des apostrophes ou des tirets.`
  }
  if (TRIPLE_LETTRE_REGEX.test(nom)) return `${libelle} ne peut pas contenir trois lettres identiques à la suite.`
  return ''
}

// E-mail : seuls les espaces de début et de fin sont retirés.
export function normaliserEmail(valeur) {
  return String(valeur ?? '').trim()
}

export function erreurEmail(valeur) {
  const email = normaliserEmail(valeur)
  if (!email) return "L'adresse e-mail est obligatoire."
  if (email.length > EMAIL_LONGUEUR_MAX) return "L'adresse e-mail est trop longue."
  if (!EMAIL_REGEX.test(email)) return 'Veuillez saisir une adresse e-mail valide.'
  return ''
}

// Pour un éventuel champ « confirmer l'e-mail » (comparaison sans tenir compte de la casse).
export function erreurConfirmationEmail(email, confirmation) {
  if (!normaliserEmail(confirmation)) return "Veuillez confirmer l'adresse e-mail."
  if (normaliserEmail(email).toLowerCase() !== normaliserEmail(confirmation).toLowerCase()) {
    return 'Les deux adresses e-mail ne correspondent pas.'
  }
  return ''
}

// Téléphone : garde les chiffres et retire l'indicatif +221 / 00221 (collé depuis un contact).
export function normaliserTelephone(valeur) {
  let chiffres = String(valeur ?? '').replace(/\D/g, '')
  if (chiffres.startsWith('00221')) chiffres = chiffres.slice(5)
  else if (chiffres.startsWith('221') && chiffres.length === 12) chiffres = chiffres.slice(3)
  return chiffres
}

export function erreurTelephone(valeur) {
  const brut = String(valeur ?? '').trim()
  if (!brut) return 'Le numéro de téléphone est obligatoire.'
  if (/[^\d\s.+()-]/.test(brut)) return 'Le numéro de téléphone ne doit contenir que des chiffres.'
  const numero = normaliserTelephone(brut)
  if (numero.length !== 9) return 'Le numéro doit contenir exactement 9 chiffres (ex. 77 123 45 67).'
  if (!TELEPHONE_REGEX.test(numero)) return 'Veuillez saisir un numéro mobile sénégalais valide (70, 75, 76, 77 ou 78).'
  return ''
}

// Affichage « 77 123 45 67 » pendant la saisie.
export function formaterTelephone(valeur) {
  const chiffres = normaliserTelephone(valeur).slice(0, 9)
  return [chiffres.slice(0, 2), chiffres.slice(2, 5), chiffres.slice(5, 7), chiffres.slice(7, 9)]
    .filter(Boolean)
    .join(' ')
}

// Mot de passe : jamais modifié, jamais journalisé.
export function erreurMotDePasse(valeur) {
  const motDePasse = String(valeur ?? '')
  if (!motDePasse) return 'Le mot de passe est obligatoire.'
  if (motDePasse !== motDePasse.trim()) return 'Le mot de passe ne doit pas commencer ni se terminer par un espace.'
  if (motDePasse.length < MOT_DE_PASSE_LONGUEUR_MIN) {
    return `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_LONGUEUR_MIN} caractères.`
  }
  if (motDePasse.length > MOT_DE_PASSE_LONGUEUR_MAX) {
    return `Le mot de passe ne doit pas dépasser ${MOT_DE_PASSE_LONGUEUR_MAX} caractères.`
  }
  if (!/\p{L}/u.test(motDePasse)) return 'Le mot de passe doit contenir au moins une lettre.'
  if (!/\d/.test(motDePasse)) return 'Le mot de passe doit contenir au moins un chiffre.'
  return ''
}

export function erreurConfirmationMotDePasse(motDePasse, confirmation) {
  if (!confirmation) return 'Veuillez confirmer le mot de passe.'
  if (motDePasse !== confirmation) return 'Les deux mots de passe ne correspondent pas.'
  return ''
}

export function erreurRole(valeur) {
  return ROLES_INSCRIPTION.includes(valeur) ? '' : 'Veuillez choisir un rôle : client ou prestataire.'
}

/**
 * Transforme une erreur DRF en messages lisibles.
 *   { email: ["Cette adresse e-mail est déjà utilisée."] }
 *     → { champs: { email: "Cette adresse e-mail est déjà utilisée." }, general: "" }
 *   { detail: "..." } ou { non_field_errors: [...] } → general
 */
export function extraireErreursApi(data, messageParDefaut = 'Une erreur est survenue. Veuillez réessayer.') {
  const champs = {}
  let general = ''

  if (data && typeof data === 'object') {
    for (const [cle, valeur] of Object.entries(data)) {
      const message = [valeur].flat(Infinity).find((element) => typeof element === 'string' && element)
      if (!message) continue
      if (cle === 'detail' || cle === 'non_field_errors') general = message
      else if (cle !== 'code') champs[cle] = message
    }
  }

  if (!general && !Object.keys(champs).length) general = messageParDefaut
  return { champs, general }
}
