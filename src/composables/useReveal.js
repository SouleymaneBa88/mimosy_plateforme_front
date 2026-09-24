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
  let observateur = null

  onMounted(() => {
    const conteneur = unref(racine)
    if (!conteneur) return

    const elements = conteneur.matches?.(selecteur)
      ? [conteneur]
      : Array.from(conteneur.querySelectorAll(selecteur))
    if (!elements.length) return

    const reduire = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduire || !('IntersectionObserver' in window)) return

    elements.forEach((element) => {
      const delai = Number(element.dataset.reveal)
      if (delai) element.style.setProperty('--reveal-delay', `${delai}ms`)
      element.classList.add('reveal')
    })

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

    elements.forEach((element) => observateur.observe(element))
  })

  onBeforeUnmount(() => observateur?.disconnect())
}
