/**
 * Indique si la page a défilé au-delà d'un seuil. Sert aux headers en verre
 * pour passer d'un verre léger à un verre plus dense après le premier scroll.
 *
 * Écoute passive + requestAnimationFrame : au plus une mise à jour par
 * frame, et la valeur ne change que lorsqu'on franchit le seuil.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useScrolled(seuil = 12) {
  const scrolled = ref(false)
  let frame = 0

  function mesurer() {
    frame = 0
    const estScrolle = window.scrollY > seuil
    if (estScrolle !== scrolled.value) scrolled.value = estScrolle
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(mesurer)
  }

  onMounted(() => {
    mesurer()
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
  })

  return { scrolled }
}
