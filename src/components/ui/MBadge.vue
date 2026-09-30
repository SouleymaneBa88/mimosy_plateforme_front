<script setup>
/**
 * Pastille de statut.
 *
 * Deux usages :
 *   <MBadge variant="warning">En attente</MBadge>
 *   <MBadge :status="demande.statut" :label="libelle" />  → ton déduit du
 *   statut backend (voir statusTone.js), libellé fourni par la page.
 *
 * « verified » est réservé à une vérification réellement confirmée par
 * l'API : ne jamais l'afficher par défaut.
 */
import { computed } from 'vue'
import { BadgeCheck } from 'lucide-vue-next'

import { humanizeStatus, toneForStatus } from './statusTone'

// Props : couleur, statut backend, libellé, taille, point, icône.
const props = defineProps({
  variant: {
    type: String,
    default: '',
    validator: (v) => ['', 'success', 'warning', 'danger', 'neutral', 'info', 'verified'].includes(v),
  },
  status: { type: String, default: '' },
  label: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
  dot: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
})

// La couleur : celle choisie, sinon déduite du statut, sinon "neutral".
const ton = computed(() => props.variant || (props.status ? toneForStatus(props.status) : 'neutral'))
// Le texte : celui fourni, sinon un libellé fabriqué à partir du statut.
const texteDeSecours = computed(() => props.label || (props.status ? humanizeStatus(props.status) : ''))
// L'icône : celle fournie, ou une coche pour "verified".
const iconeAffichee = computed(() => props.icon || (ton.value === 'verified' ? BadgeCheck : null))
</script>

<template>
  <span class="m-badge" :class="[`m-badge--${ton}`, `m-badge--${size}`]">
    <!-- Petit point de couleur, ou icône, avant le texte. -->
    <span v-if="dot" class="m-badge__dot" aria-hidden="true" />
    <component :is="iconeAffichee" v-else-if="iconeAffichee" :size="size === 'sm' ? 12 : 14" :stroke-width="2" aria-hidden="true" />
    <slot>{{ texteDeSecours }}</slot>
  </span>
</template>

<style scoped>
/* Dans la couche components : une classe utilitaire passée au composant
   (hidden, mt-4, w-full…) doit toujours pouvoir surcharger ces styles. */
@layer components {
  .m-badge {
    --badge-fg: var(--mimosy-neutral);
    --badge-bg: var(--mimosy-neutral-soft);

    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    max-width: 100%;
    border-radius: 999px;
    background: var(--badge-bg);
    color: var(--badge-fg);
    font-family: var(--mimosy-font-sans);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  .m-badge--md { padding: 0.4rem 0.7rem; font-size: 0.75rem; }
  .m-badge--sm { padding: 0.28rem 0.55rem; font-size: 0.6875rem; }

  .m-badge__dot {
    width: 0.4rem;
    height: 0.4rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: currentColor;
  }

  .m-badge--success { --badge-fg: var(--mimosy-success); --badge-bg: var(--mimosy-success-soft); }
  .m-badge--warning { --badge-fg: var(--mimosy-warning); --badge-bg: var(--mimosy-warning-soft); }
  .m-badge--danger  { --badge-fg: var(--mimosy-danger);  --badge-bg: var(--mimosy-danger-soft); }
  .m-badge--info    { --badge-fg: var(--mimosy-info);    --badge-bg: var(--mimosy-info-soft); }
  .m-badge--neutral { --badge-fg: var(--mimosy-neutral); --badge-bg: var(--mimosy-neutral-soft); }

  /* Vérifié : seul badge en vert profond plein, pour qu'il reste un signal
     de confiance distinct d'un simple statut « validé ». */
  .m-badge--verified {
    --badge-fg: var(--mimosy-bg);
    --badge-bg: var(--mimosy-green-dark);
  }
}
</style>
