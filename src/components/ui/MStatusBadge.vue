<script setup>
/**
 * Badge de statut métier : couleur + icône + libellé, pour que l'état ne
 * soit jamais porté par la couleur seule (accessibilité, daltonisme).
 *
 *   <MStatusBadge status="EN_ATTENTE" />
 *   <MStatusBadge status="TERMINEE" label="Terminée le 3 oct." size="sm" />
 *
 * Le ton vient de statusTone.js (source unique) ; l'icône précise la
 * nature de l'état (en attente, en cours, à vérifier, litige…).
 */
import { computed } from 'vue'
import { Ban, CheckCheck, CircleCheck, CircleDot, CircleX, Clock3, Scale, ScanEye } from 'lucide-vue-next'

import MBadge from './MBadge.vue'
import { humanizeStatus, toneForStatus } from './statusTone'

const props = defineProps({
  status: { type: String, required: true },
  label: { type: String, default: '' },
  size: { type: String, default: 'md' },
  // Force un ton quand le statut est propre à une page (ex. étapes du dossier).
  tone: { type: String, default: '' },
})

const ICONES_STATUT = {
  A_VERIFIER: ScanEye,
  EN_ANALYSE: ScanEye,
  DOSSIER_EN_REVUE: ScanEye,
  TERMINE: CheckCheck,
  TERMINEE: CheckCheck,
  ANNULE: Ban,
  ANNULEE: Ban,
  LITIGE: Scale,
  EN_LITIGE: Scale,
}
const ICONES_TON = { success: CircleCheck, warning: Clock3, danger: CircleX, info: CircleDot, neutral: CircleDot, verified: CircleCheck }

const code = computed(() => String(props.status || '').toUpperCase())
const ton = computed(() => props.tone || (['LITIGE', 'EN_LITIGE'].includes(code.value) ? 'danger' : toneForStatus(code.value)))
const icone = computed(() => ICONES_STATUT[code.value] || ICONES_TON[ton.value])
const libelle = computed(() => props.label || (['LITIGE', 'EN_LITIGE'].includes(code.value) ? 'En litige' : humanizeStatus(code.value)))
</script>

<template>
  <MBadge :variant="ton" :icon="icone" :size="size" class="m-status-badge">{{ libelle }}</MBadge>
</template>
