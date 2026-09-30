<script setup>
/**
 * Fond « aurora » : trois nappes de lumière verte et sable, floues, qui
 * dérivent très lentement (45 à 70 s par cycle). Purement décoratif :
 * aria-hidden, aucun pointeur, placé sous le contenu.
 *
 * À réserver au hero de la landing et à quelques en-têtes client. Jamais
 * dans l'admin ni derrière un tableau.
 *
 * Le parent doit être en `position: relative` (ou isolate) ; le contenu
 * par-dessus doit avoir un z-index positif ou venir après dans le flux.
 * `intensity` : subtle (défaut) ou soft (un peu plus présent).
 * Avec prefers-reduced-motion, les nappes restent fixes.
 */
// Props : intensité de l'effet et fondu en bas.
defineProps({
  intensity: { type: String, default: 'subtle', validator: (v) => ['subtle', 'soft'].includes(v) },
  // Fondu vers le fond de page en bas, pour raccorder avec la section suivante.
  fade: { type: Boolean, default: true },
})
</script>

<template>
  <div class="m-aurora" :class="[`m-aurora--${intensity}`, { 'm-aurora--fade': fade }]" aria-hidden="true">
    <!-- Les trois nappes de lumière (animées en CSS). -->
    <span class="m-aurora__layer m-aurora__layer--a" />
    <span class="m-aurora__layer m-aurora__layer--b" />
    <span class="m-aurora__layer m-aurora__layer--c" />
  </div>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-aurora {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    contain: strict;
  }

  .m-aurora--fade {
    -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
  }

  .m-aurora__layer {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    will-change: transform;
  }

  /* Vert MIMOSY, en haut à droite */
  .m-aurora__layer--a {
    top: -18%;
    right: -8%;
    width: 58vmax;
    height: 42vmax;
    background: radial-gradient(closest-side, rgba(45, 106, 79, 0.2), rgba(45, 106, 79, 0) 70%);
    animation: m-aurora-a 64s ease-in-out infinite alternate;
  }

  /* Vert clair, au centre gauche */
  .m-aurora__layer--b {
    top: 8%;
    left: -14%;
    width: 50vmax;
    height: 36vmax;
    background: radial-gradient(closest-side, rgba(62, 128, 100, 0.16), rgba(62, 128, 100, 0) 70%);
    animation: m-aurora-b 52s ease-in-out infinite alternate;
  }

  /* Sable chaud : réchauffe le vert, évite l'effet « tech » froid */
  .m-aurora__layer--c {
    top: 30%;
    right: 18%;
    width: 40vmax;
    height: 28vmax;
    background: radial-gradient(closest-side, rgba(214, 196, 158, 0.34), rgba(214, 196, 158, 0) 70%);
    animation: m-aurora-c 72s ease-in-out infinite alternate;
  }

  .m-aurora--subtle .m-aurora__layer { opacity: 0.75; }
  .m-aurora--soft .m-aurora__layer { opacity: 1; }

  @keyframes m-aurora-a {
    from { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
    to { transform: translate3d(-6%, 5%, 0) rotate(8deg) scale(1.08); }
  }

  @keyframes m-aurora-b {
    from { transform: translate3d(0, 0, 0) scale(1); }
    to { transform: translate3d(8%, -4%, 0) scale(1.1); }
  }

  @keyframes m-aurora-c {
    from { transform: translate3d(0, 0, 0) scale(1.05); }
    to { transform: translate3d(-7%, -6%, 0) scale(0.95); }
  }

  @media (prefers-reduced-motion: reduce) {
    .m-aurora__layer {
      animation: none !important;
    }
  }
}
</style>
