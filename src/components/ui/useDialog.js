/**
 * Comportement commun à MModal et MDrawer :
 *   - fermeture par Échap ;
 *   - focus déplacé dans le panneau à l'ouverture, piégé avec Tab ;
 *   - focus rendu à l'élément d'origine à la fermeture ;
 *   - scroll de la page bloqué tant qu'au moins un dialogue est ouvert.
 */
import { nextTick, onBeforeUnmount, watch } from 'vue'

// Liste des éléments qui peuvent recevoir le focus (liens, boutons, champs...).
const FOCUSABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

// Compteur partagé : une modale ouverte depuis un tiroir ne doit pas
// débloquer le scroll en se fermant.
let dialoguesOuverts = 0

// Bloque le défilement de la page à l'ouverture du premier dialogue.
function bloquerScroll() {
  if (dialoguesOuverts++ === 0) document.body.style.overflow = 'hidden'
}

// Débloque le défilement quand le dernier dialogue se ferme.
function debloquerScroll() {
  dialoguesOuverts = Math.max(0, dialoguesOuverts - 1)
  if (dialoguesOuverts === 0) document.body.style.overflow = ''
}

// ouvert  = ref booléen (le dialogue est-il ouvert ?)
// panneau = ref vers l'élément HTML du dialogue
// fermer  = fonction à appeler pour fermer
export function useDialog(ouvert, panneau, fermer, { fermerAvecEchap = () => true } = {}) {
  // origine = l'élément qui avait le focus avant l'ouverture.
  let origine = null
  let actif = false

  // Renvoie les éléments focusables visibles dans le panneau.
  function elementsFocusables() {
    return Array.from(panneau.value?.querySelectorAll(FOCUSABLES) || []).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }

  // Gestion du clavier dans le dialogue.
  function onKeydown(evenement) {
    // Touche Échap : on ferme.
    if (evenement.key === 'Escape' && fermerAvecEchap()) {
      evenement.stopPropagation()
      fermer()
      return
    }
    // Pour les autres touches, on ne s'occupe que de Tab.
    if (evenement.key !== 'Tab') return

    const elements = elementsFocusables()
    if (!elements.length) {
      evenement.preventDefault()
      panneau.value?.focus()
      return
    }
    // Tab sur le dernier élément -> retour au premier (et l'inverse avec Maj+Tab) :
    // le focus reste "piégé" dans le dialogue.
    const premier = elements[0]
    const dernier = elements[elements.length - 1]
    if (evenement.shiftKey && document.activeElement === premier) {
      evenement.preventDefault()
      dernier.focus()
    } else if (!evenement.shiftKey && document.activeElement === dernier) {
      evenement.preventDefault()
      premier.focus()
    }
  }

  // À l'ouverture : on retient le focus d'origine, on bloque le scroll, puis on place le focus.
  async function activer() {
    if (actif) return
    actif = true
    origine = document.activeElement
    bloquerScroll()
    await nextTick()
    // Le premier champ reçoit le focus ; à défaut, le panneau lui-même.
    const cible = panneau.value?.querySelector('[autofocus]') || elementsFocusables()[0] || panneau.value
    cible?.focus({ preventScroll: true })
  }

  // À la fermeture : on débloque le scroll et on rend le focus à l'élément d'origine.
  function desactiver() {
    if (!actif) return
    actif = false
    debloquerScroll()
    if (origine && typeof origine.focus === 'function') origine.focus({ preventScroll: true })
    origine = null
  }

  // On surveille "ouvert" : ouverture -> activer(), fermeture -> desactiver().
  watch(ouvert, (valeur) => (valeur ? activer() : desactiver()), { immediate: true })
  // Si le composant disparaît pendant que le dialogue est ouvert, on nettoie.
  onBeforeUnmount(desactiver)

  return { onKeydown }
}
