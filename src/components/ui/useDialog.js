/**
 * Comportement commun à MModal et MDrawer :
 *   - fermeture par Échap ;
 *   - focus déplacé dans le panneau à l'ouverture, piégé avec Tab ;
 *   - focus rendu à l'élément d'origine à la fermeture ;
 *   - scroll de la page bloqué tant qu'au moins un dialogue est ouvert.
 */
import { nextTick, onBeforeUnmount, watch } from 'vue'

const FOCUSABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

// Compteur partagé : une modale ouverte depuis un tiroir ne doit pas
// débloquer le scroll en se fermant.
let dialoguesOuverts = 0

function bloquerScroll() {
  if (dialoguesOuverts++ === 0) document.body.style.overflow = 'hidden'
}

function debloquerScroll() {
  dialoguesOuverts = Math.max(0, dialoguesOuverts - 1)
  if (dialoguesOuverts === 0) document.body.style.overflow = ''
}

export function useDialog(ouvert, panneau, fermer, { fermerAvecEchap = () => true } = {}) {
  let origine = null
  let actif = false

  function elementsFocusables() {
    return Array.from(panneau.value?.querySelectorAll(FOCUSABLES) || []).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }

  function onKeydown(evenement) {
    if (evenement.key === 'Escape' && fermerAvecEchap()) {
      evenement.stopPropagation()
      fermer()
      return
    }
    if (evenement.key !== 'Tab') return

    const elements = elementsFocusables()
    if (!elements.length) {
      evenement.preventDefault()
      panneau.value?.focus()
      return
    }
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

  function desactiver() {
    if (!actif) return
    actif = false
    debloquerScroll()
    if (origine && typeof origine.focus === 'function') origine.focus({ preventScroll: true })
    origine = null
  }

  watch(ouvert, (valeur) => (valeur ? activer() : desactiver()), { immediate: true })
  onBeforeUnmount(desactiver)

  return { onKeydown }
}
