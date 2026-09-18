<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  providers: {
    type: Array,
    default: () => [],
  },

  title: {
    type: String,
    default: 'Prestataires près de vous',
  },

  location: {
    type: String,
    default: 'localisation non disponible',
  },

  clientLocation: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['view-profile', 'request'])

const mapContainer = ref(null)

let map = null
let clientMarker = null
let clientCircle = null
let providerMarkers = []

// Marqueur rond vert pour représenter la position du client sur la carte
const clientIcon = L.divIcon({
  className: 'mimosy-client-marker',
  html: `
    <div style="width:40px;height:40px;border-radius:50%;background:#2F6250;border:4px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.20);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

// Même logique pour les prestataires, avec une icône de localisation
const providerIcon = L.divIcon({
  className: 'mimosy-provider-marker',
  html: `
    <div style="width:38px;height:38px;border-radius:50%;background:#2F6250;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/>
        <circle cx="12" cy="10" r="2.5"/>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const initializeMap = async () => {
  await nextTick()

  if (!mapContainer.value) {
    return
  }

  if (!props.clientLocation) {
    return
  }

  map = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([props.clientLocation.lat, props.clientLocation.lng], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  clientMarker = L.marker([props.clientLocation.lat, props.clientLocation.lng], { icon: clientIcon })
    .addTo(map)
    .bindPopup(`<div><strong>Votre position</strong><br>${props.location}</div>`)

  clientCircle = L.circle([props.clientLocation.lat, props.clientLocation.lng], {
    radius: 2000,
    color: '#2F6250',
    fillColor: '#2F6250',
    fillOpacity: 0.08,
    weight: 1,
  }).addTo(map)

  addProviderMarkers()

  // Leaflet calcule mal sa taille quand le conteneur était caché au montage (ex: onglet, sidebar animée)
  setTimeout(() => {
    map?.invalidateSize()
  }, 100)
}

const addProviderMarkers = () => {
  if (!map) {
    return
  }

  providerMarkers.forEach((marker) => map.removeLayer(marker))
  providerMarkers = []

  props.providers.forEach((provider) => {
    if (typeof provider.latitude !== 'number' || typeof provider.longitude !== 'number') {
      return
    }

    const marker = L.marker([provider.latitude, provider.longitude], { icon: providerIcon }).addTo(map)

    marker.bindPopup(`
      <div style="min-width: 180px;">
        <strong>${provider.name}</strong><br>
        <span>${provider.profession}</span><br>
        <span>${provider.distance ?? ''} km</span>
      </div>
    `)

    marker.on('click', () => emit('view-profile', provider))

    providerMarkers.push(marker)
  })
}

const centerOnClient = () => {
  if (!map) {
    return
  }

  map.setView([props.clientLocation.lat, props.clientLocation.lng], 14)
}

onMounted(() => {
  initializeMap()
})

watch(
  () => props.providers,
  () => addProviderMarkers(),
  { deep: true },
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }

  clientMarker = null
  clientCircle = null
  providerMarkers = []
})
</script>

<template>
  <section class="w-full">
    <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div class="min-w-0">
        <h2 class="text-[18px] font-bold leading-7 text-[#051F20] sm:text-[20px] sm:leading-[30px]">
          {{ title }}
        </h2>
        <p class="mt-1 text-[12px] leading-[18px] text-[#64748B] sm:text-[13px] sm:leading-[19.5px]">
          Professionnels disponibles autour de {{ location }}
        </p>
      </div>

      <button type="button" class="self-start shrink-0 text-[12px] font-bold text-[#2F6250] hover:underline sm:self-auto sm:text-[13px]">
        Voir tout
      </button>
    </div>

    <div class="grid w-full gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <!-- Carte -->
      <div v-if="clientLocation" class="relative min-h-[280px] overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-[#E8ECEB] sm:min-h-[350px] sm:rounded-[22px] lg:min-h-[420px] lg:rounded-[24px]">
        <div ref="mapContainer" class="absolute inset-0 z-0"></div>

        <div class="absolute bottom-3 left-3 z-[1000] rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm sm:bottom-4 sm:left-4 sm:px-4 sm:py-3">
          <p class="text-[11px] font-semibold text-[#051F20] sm:text-xs">
            {{ providers.length }} prestataire{{ providers.length > 1 ? 's' : '' }}
          </p>
          <p class="mt-0.5 text-[10px] text-[#64748B] sm:text-[11px]">
            autour de vous
          </p>
        </div>

        <button
          type="button"
          class="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#2F6250] shadow-sm transition hover:bg-[#F5F6F4] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
          aria-label="Recentrer la carte"
          title="Recentrer la carte"
          @click="centerOnClient"
        >
          <svg class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>
      </div>
      <div v-else class="flex min-h-[280px] items-center justify-center rounded-[20px] border border-dashed border-[#E2E8F0] bg-white p-6 text-center sm:min-h-[350px] sm:rounded-[22px] lg:min-h-[420px] lg:rounded-[24px]">
        <p class="max-w-sm text-sm leading-6 text-[#64748B]">
          La localisation du client n'est pas encore disponible dans l'API.
        </p>
      </div>

      <!-- Liste des prestataires -->
      <div class="space-y-3 sm:space-y-4">
        <article
          v-for="provider in providers.slice(0, 2)"
          :key="provider.id"
          class="rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:rounded-[20px] sm:p-5"
        >
          <div class="flex items-start gap-3 sm:gap-4">
            <div v-if="provider.avatar" class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EAF8F2] sm:h-14 sm:w-14">
              <img :src="provider.avatar" :alt="`Photo de ${provider.name}`" class="h-full w-full object-cover" />
            </div>
            <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8F2] text-lg font-extrabold text-[#2F6250] sm:h-14 sm:w-14">
              {{ provider.name?.charAt(0) || '?' }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="truncate text-[14px] font-bold leading-5 text-[#051F20] sm:text-[15px] sm:leading-[22px]">
                    {{ provider.name }}
                  </h3>
                  <p class="mt-0.5 truncate text-[12px] leading-[18px] text-[#64748B] sm:text-[13px] sm:leading-[19.5px]">
                    {{ provider.profession }}
                  </p>
                </div>

                <span v-if="provider.verified" class="shrink-0 rounded-full bg-[#EAF8F2] px-2 py-1 text-[9px] font-bold text-[#16805B] sm:text-[10px]">
                  Vérifié
                </span>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:mt-3 sm:gap-x-3 sm:text-[12px]">
                <span v-if="provider.rating != null" class="flex items-center gap-1 font-bold text-[#334155]">★ {{ provider.rating }}</span>
                <span v-if="provider.reviews != null" class="text-[#64748B]">({{ provider.reviews }} avis)</span>
                <span v-if="provider.distance != null" class="text-[#64748B]">{{ provider.distance }} km</span>
              </div>

              <div class="mt-2 sm:mt-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-[11px]"
                  :class="provider.available ? 'bg-[#EAF8F2] text-[#16805B]' : 'bg-[#F1F5F9] text-[#64748B]'"
                >
                  {{ provider.available ? 'Disponible' : 'Indisponible' }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
            <button
              type="button"
              class="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[11px] font-bold text-[#051F20] transition hover:bg-[#FAF5F0] sm:text-[12px]"
              @click="emit('view-profile', provider)"
            >
              Profil
            </button>
            <button
              type="button"
              class="rounded-xl bg-[#051F20] px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#2F6250] active:bg-[#1D4033] sm:text-[12px]"
              @click="emit('request', provider)"
            >
              Demander
            </button>
          </div>
        </article>

        <div
          v-if="providers.length === 0"
          class="flex min-h-[180px] items-center justify-center rounded-[18px] border border-dashed border-[#E2E8F0] bg-white p-5 text-center sm:min-h-[220px] sm:rounded-[20px] sm:p-6"
        >
          <div>
            <p class="font-semibold text-[#051F20]">Aucun prestataire trouvé</p>
            <p class="mt-1 text-sm text-[#64748B]">Aucun professionnel n'est disponible près de vous pour le moment.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>