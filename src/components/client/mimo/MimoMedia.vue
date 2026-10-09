<script setup>
/**
 * Photo ou vidéo d'un message de la conversation.
 *
 * Source : l'aperçu local (blob, dès la sélection) ou, après un rechargement de
 * la page, le fichier privé du serveur chargé avec le jeton (recupererMediaMimo).
 * Le fichier n'est jamais public. L'état d'analyse affiché est celui renvoyé par
 * le backend : une vidéo n'est dite « analysée » que sur ses images-clés.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ImageOff, LoaderCircle, Maximize2 } from 'lucide-vue-next'

import { recupererMediaMimo } from '@/services/diagnosisService'
import MimoVisionneuse from './MimoVisionneuse.vue'

const props = defineProps({
  // { type: 'image' | 'video', nom, apercu?, url?, analyse?: 'en_cours' | 'effectuee' | 'echec', images_analysees? }
  media: { type: Object, required: true },
})

const source = ref(props.media.apercu || '')
const chargement = ref(false)
const indisponible = ref(false)
const duree = ref('')
const visionneuse = ref(false)
// Format que ce navigateur ne sait pas décoder (ex. HEVC d'iPhone dans Chrome).
const illisible = ref(false)
// Aperçu local illisible pendant l'envoi : on attend l'URL de la copie convertie par le serveur.
const attenteCopieServeur = ref(false)
let blobCharge = ''

const estVideo = computed(() => props.media.type === 'video')
const libelleAnalyse = computed(() => {
  if (props.media.analyse === 'en_cours') return estVideo.value ? 'Analyse de la vidéo…' : 'Analyse de la photo…'
  if (props.media.analyse === 'effectuee') {
    if (!estVideo.value) return 'Photo analysée par Mimo'
    const n = props.media.images_analysees
    return n ? `${n} image${n > 1 ? 's' : ''} de la vidéo analysée${n > 1 ? 's' : ''} (son non analysé)` : 'Vidéo analysée (son non analysé)'
  }
  if (props.media.analyse === 'echec') return 'Mimo n’a pas pu analyser ce média ; il reste joint à la conversation.'
  return ''
})

async function charger({ depuisServeur = false } = {}) {
  if ((source.value && !depuisServeur) || !props.media.url) return
  chargement.value = true
  indisponible.value = false
  try {
    blobCharge = await recupererMediaMimo(props.media.url)
    source.value = blobCharge
  } catch {
    indisponible.value = true
  } finally {
    chargement.value = false
  }
}

// Aperçu local illisible : la copie du serveur (réencodée en H.264 si besoin) est essayée.
async function surErreurVideo() {
  const depuisApercu = Boolean(props.media.apercu) && source.value === props.media.apercu
  if (depuisApercu && props.media.url) {
    source.value = ''
    await charger({ depuisServeur: true })
    return
  }
  if (depuisApercu && props.media.analyse === 'en_cours') {
    source.value = ''
    attenteCopieServeur.value = true
    return
  }
  illisible.value = true
}

watch(() => [props.media.url, props.media.analyse], async ([url, analyse]) => {
  if (!attenteCopieServeur.value || analyse === 'en_cours') return
  attenteCopieServeur.value = false
  if (url) await charger({ depuisServeur: true })
  else illisible.value = true
})

function surMetadonnees(event) {
  const secondes = event.target.duration
  if (!Number.isFinite(secondes) || secondes <= 0) return
  const total = Math.round(secondes)
  duree.value = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

watch(() => props.media.apercu, (apercu) => {
  if (apercu && !illisible.value) source.value = apercu
})
charger()

onBeforeUnmount(() => {
  if (blobCharge) URL.revokeObjectURL(blobCharge)
})
</script>

<template>
  <figure class="flex flex-col gap-1.5" data-testid="mimo-media">
    <div class="relative overflow-hidden rounded-2xl bg-mimosy-page">
      <div v-if="chargement" class="flex h-40 w-56 max-w-full items-center justify-center text-mimosy-secondary">
        <LoaderCircle class="animate-spin motion-reduce:animate-none" :size="20" :stroke-width="2" />
        <span class="sr-only">Chargement du média</span>
      </div>
      <div
        v-else-if="estVideo && attenteCopieServeur"
        class="flex h-28 w-56 max-w-full flex-col items-center justify-center gap-1.5 px-3 text-center font-sans text-xs text-mimosy-secondary"
        role="status"
        data-testid="mimo-media-video-conversion"
      >
        <LoaderCircle class="animate-spin motion-reduce:animate-none" :size="18" :stroke-width="2" />
        Conversion de la vidéo pour la lecture…
      </div>
      <div
        v-else-if="indisponible || !source"
        class="flex h-28 w-56 max-w-full flex-col items-center justify-center gap-1.5 px-3 text-center font-sans text-xs text-mimosy-secondary"
        role="status"
      >
        <ImageOff :size="18" :stroke-width="2" />
        {{ indisponible ? 'Ce média n’est plus disponible.' : media.nom }}
        <button v-if="indisponible" type="button" class="font-bold text-mimosy-primary underline" @click="charger">Réessayer</button>
      </div>
      <div
        v-else-if="estVideo && illisible"
        class="flex h-28 w-56 max-w-full flex-col items-center justify-center gap-1 px-3 text-center font-sans text-xs text-mimosy-secondary"
        role="status"
        data-testid="mimo-media-video-illisible"
      >
        <ImageOff :size="18" :stroke-width="2" />
        Ce navigateur ne peut pas lire ce format vidéo.
      </div>
      <video
        v-else-if="estVideo"
        :src="source"
        controls
        playsinline
        preload="metadata"
        class="block max-h-64 w-64 max-w-full bg-black"
        :aria-label="`Vidéo ${media.nom || 'envoyée à Mimo'}`"
        data-testid="mimo-media-video"
        @loadedmetadata="surMetadonnees"
        @error="surErreurVideo"
      ></video>
      <button
        v-else
        type="button"
        class="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mimosy-primary"
        :aria-label="`Agrandir la photo ${media.nom || ''}`.trim()"
        data-testid="mimo-media-image"
        @click="visionneuse = true"
      >
        <img :src="source" :alt="media.nom ? `Photo : ${media.nom}` : 'Photo envoyée à Mimo'" class="block max-h-64 w-56 max-w-full object-cover" />
        <span class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1c2420]/60 text-white opacity-90 transition group-hover:opacity-100">
          <Maximize2 :size="14" :stroke-width="2.2" />
        </span>
      </button>
    </div>
    <figcaption class="flex flex-wrap items-center gap-x-2 font-sans text-[11px] opacity-90">
      <span v-if="media.nom" class="max-w-[14rem] truncate">{{ media.nom }}</span>
      <span v-if="duree">· {{ duree }}</span>
      <span v-if="libelleAnalyse" class="flex items-center gap-1" data-testid="mimo-media-analyse" role="status">
        <LoaderCircle v-if="media.analyse === 'en_cours'" class="animate-spin motion-reduce:animate-none" :size="11" :stroke-width="2.4" />
        {{ libelleAnalyse }}
      </span>
    </figcaption>
    <MimoVisionneuse v-if="visionneuse && source" :src="source" :alt="media.nom ? `Photo : ${media.nom}` : 'Photo envoyée à Mimo'" @fermer="visionneuse = false" />
  </figure>
</template>
