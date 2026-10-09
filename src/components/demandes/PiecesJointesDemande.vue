<script setup>
/**
 * Photos jointes à une demande de prestation (envoyées par le client à Mimo).
 *
 * Les fichiers ne sont jamais servis par une URL média publique : chaque
 * aperçu est chargé par un fetch authentifié (le serveur vérifie que
 * l'utilisateur est le client, le prestataire de la demande ou un admin),
 * puis affiché via une URL locale révoquée quand le composant disparaît.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { Camera } from 'lucide-vue-next'

import { recupererApercuPieceJointe } from '@/services/demandePrestationService'

const props = defineProps({
  pieces: { type: Array, default: () => [] },
})

// id de la pièce -> URL locale de l'aperçu ('' tant qu'il charge, null en cas d'échec).
const apercus = ref({})

function liberer() {
  Object.values(apercus.value).forEach((url) => url && URL.revokeObjectURL(url))
  apercus.value = {}
}

async function charger(pieces) {
  liberer()
  await Promise.all(
    pieces.map(async (piece) => {
      apercus.value = { ...apercus.value, [piece.id]: '' }
      try {
        const url = await recupererApercuPieceJointe(piece.id)
        apercus.value = { ...apercus.value, [piece.id]: url }
      } catch {
        apercus.value = { ...apercus.value, [piece.id]: null }
      }
    }),
  )
}

watch(() => props.pieces.map((piece) => piece.id).join(','), () => charger(props.pieces), { immediate: true })
onBeforeUnmount(liberer)
</script>

<template>
  <div v-if="pieces.length" data-testid="pieces-jointes-demande">
    <p class="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[1px] text-mimosy-secondary">
      <Camera :size="12" :stroke-width="2" /> Photos du client ({{ pieces.length }})
    </p>
    <div class="mt-2 flex flex-wrap gap-2">
      <template v-for="piece in pieces" :key="piece.id">
        <a v-if="apercus[piece.id]" :href="apercus[piece.id]" target="_blank" rel="noopener" :title="piece.nom">
          <img :src="apercus[piece.id]" :alt="piece.nom || 'Photo du client'" class="h-20 w-20 rounded-lg border border-mimosy-border object-cover" />
        </a>
        <span v-else class="flex h-20 w-20 items-center justify-center rounded-lg border border-mimosy-border px-1 text-center font-sans text-[11px] text-mimosy-secondary">
          {{ apercus[piece.id] === null ? 'Photo indisponible' : 'Chargement…' }}
        </span>
      </template>
    </div>
  </div>
</template>
