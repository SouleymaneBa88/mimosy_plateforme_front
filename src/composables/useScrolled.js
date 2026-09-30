/**
 * Indique si la page a défilé au-delà d'un seuil. Sert aux headers en verre
 * pour passer d'un verre léger à un verre plus dense après le premier scroll.
 *
 * Écoute passive + requestAnimationFrame : au plus une mise à jour par
 * frame, et la valeur ne change que lorsqu'on franchit le seuil.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useScrolled(seuil = 12) {
  // true si la page a défilé au-delà du seuil (12 px par défaut).
  const scrolled = ref(false)
  let frame = 0

  // Compare la position de défilement au seuil.
  function mesurer() {
    frame = 0
    const estScrolle = window.scrollY > seuil
    if (estScrolle !== scrolled.value) scrolled.value = estScrolle
  }

  // À chaque défilement, on demande une mesure à la prochaine image (une seule à la fois).
  function onScroll() {
    if (!frame) frame = requestAnimationFrame(mesurer)
  }

  // Au montage : première mesure et écoute du défilement.
  onMounted(() => {
    mesurer()
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  // Au démontage : on arrête d'écouter.
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
  })

  return { scrolled }
}
