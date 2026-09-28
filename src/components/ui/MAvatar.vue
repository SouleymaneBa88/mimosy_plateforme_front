<script setup>
/**
 * Avatar : photo réelle si l'API en fournit une, sinon initiales du nom.
 * Si l'image échoue à charger (URL cassée), on retombe aussi sur les
 * initiales. Jamais d'image de remplacement.
 */
import { computed, ref, watch } from 'vue'
import { UserRound } from 'lucide-vue-next'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v),
  },
  // Pastille « vérifié » : uniquement si l'API l'indique.
  verified: { type: Boolean, default: false },
})

const imageEnErreur = ref(false)
watch(() => props.src, () => { imageEnErreur.value = false })

const afficherImage = computed(() => Boolean(props.src) && !imageEnErreur.value)

const initiales = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join(''),
)

// Teinte stable dérivée du nom, choisie parmi des verts/sables proches de
// la marque, pour distinguer les personnes dans une liste sans couleurs vives.
const TEINTES = [
  ['#E4EDE7', '#24573F'],
  ['#EDE8DE', '#5E5230'],
  ['#E3EDEE', '#2F5F66'],
  ['#EFEAE4', '#6B4A3A'],
  ['#E8EBE3', '#45513D'],
]

const teinte = computed(() => {
  let somme = 0
  for (const lettre of props.name) somme = (somme + lettre.charCodeAt(0)) % 997
  return TEINTES[somme % TEINTES.length]
})

const tailleIcone = computed(() => ({ xs: 12, sm: 14, md: 18, lg: 22, xl: 28 })[props.size])
</script>

<template>
  <span class="m-avatar" :class="`m-avatar--${size}`">
    <img
      v-if="afficherImage"
      :src="src"
      :alt="name ? `Photo de ${name}` : ''"
      class="m-avatar__img"
      loading="lazy"
      decoding="async"
      @error="imageEnErreur = true"
    />
    <span
      v-else
      class="m-avatar__initiales"
      :style="{ backgroundColor: teinte[0], color: teinte[1] }"
      :role="name ? 'img' : undefined"
      :aria-label="name || undefined"
    >
      <template v-if="initiales">{{ initiales }}</template>
      <UserRound v-else :size="tailleIcone" :stroke-width="1.8" aria-hidden="true" />
    </span>

    <span v-if="verified" class="m-avatar__verified" title="Profil vérifié">
      <span class="sr-only">Profil vérifié</span>
    </span>
  </span>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-avatar {
    --size: 2.5rem;
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);
  }

  .m-avatar--xs { --size: 1.5rem; font-size: 0.625rem; }
  .m-avatar--sm { --size: 2rem; font-size: 0.75rem; }
  .m-avatar--md { --size: 2.5rem; font-size: 0.875rem; }
  .m-avatar--lg { --size: 3.5rem; font-size: 1.125rem; }
  .m-avatar--xl { --size: 5.5rem; font-size: 1.75rem; }

  .m-avatar__img,
  .m-avatar__initiales {
    width: 100%;
    height: 100%;
    border-radius: 999px;
  }

  .m-avatar__img {
    object-fit: cover;
    background: var(--mimosy-sunken);
    outline: 1px solid rgba(28, 36, 32, 0.06);
    outline-offset: -1px;
  }

  .m-avatar__initiales {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mimosy-font-sans);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .m-avatar--lg .m-avatar__initiales,
  .m-avatar--xl .m-avatar__initiales {
    font-family: var(--mimosy-font-serif);
    font-weight: 400;
    letter-spacing: 0;
  }

  .m-avatar__verified {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 34%;
    height: 34%;
    min-width: 10px;
    min-height: 10px;
    border: 2px solid var(--mimosy-bg);
    border-radius: 999px;
    background: var(--mimosy-green);
  }
}
</style>
