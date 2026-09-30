/**
 * Fait apparaître des éléments au moment où ils entrent dans l'écran.
 *
 * Usage :
 *   const racine = ref(null)
 *   useReveal(racine)            // révèle chaque [data-reveal] sous racine
 *   <section ref="racine"><h2 data-reveal>…</h2></section>
 *
 * Chaque élément reçoit la classe .reveal (état caché, voir motion.css) puis
 * .is-visible une seule fois ; l'observateur le relâche ensuite. Un
 * attribut data-reveal="120" décale l'apparition de 120ms.
 *
 * Sans IntersectionObserver ou avec prefers-reduced-motion, les éléments
 * sont affichés immédiatement : le contenu n'est jamais conditionné à
 * l'animation.
 */
import { onBeforeUnmount, onMounted, unref } from 'vue'

export function useReveal(racine, { selecteur = '[data-reveal]', marge = '0px 0px -8% 0px' } = {}) {
  // L'observateur qui surveille quand les éléments entrent dans l'écran.
  let observateur = null

  onMounted(() => {
    // On récupère l'élément racine.
    const conteneur = unref(racine)
    if (!conteneur) return

    // On trouve les éléments à animer (la racine elle-même, ou ses enfants [data-reveal]).
    const elements = conteneur.matches?.(selecteur)
      ? [conteneur]
      : Array.from(conteneur.querySelectorAll(selecteur))
    if (!elements.length) return

    // Si l'utilisateur préfère moins d'animations, ou si le navigateur est trop ancien, on n'anime pas.
    const reduire = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduire || !('IntersectionObserver' in window)) return

    // On prépare chaque élément : délai éventuel + classe "caché".
    elements.forEach((element) => {
      const delai = Number(element.dataset.reveal)
      if (delai) element.style.setProperty('--reveal-delay', `${delai}ms`)
      element.classList.add('reveal')
    })

    // Quand un élément devient visible, on ajoute "is-visible" et on arrête de le surveiller.
    observateur = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          if (!entree.isIntersecting) return
          entree.target.classList.add('is-visible')
          observateur.unobserve(entree.target)
        })
      },
      { rootMargin: marge, threshold: 0.12 },
    )

    // On commence à surveiller chaque élément.
    elements.forEach((element) => observateur.observe(element))
  })

  // Quand le composant disparaît, on arrête l'observateur.
  onBeforeUnmount(() => observateur?.disconnect())
}
