<script setup>
/**
 * Carte Leaflet réutilisable : position du client + marqueurs des
 * prestataires. Ne fait aucune recherche elle-même : elle affiche
 * simplement les données déjà obtenues par l'appelant (mêmes
 * résultats que la liste, jamais une deuxième requête).
 *
 * Extraite de NearbyProviders.vue (qui l'utilise maintenant) pour
 * pouvoir aussi être utilisée sur la page de recherche complète, sans
 * dupliquer toute la logique Leaflet à deux endroits.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { formaterDistanceKm } from '@/utils/format'

const props = defineProps({
  // Position utilisée pour la recherche en cours : { lat, lng }.
  // Toujours la même source que la requête API, jamais une deuxième
  // géolocalisation indépendante.
  clientLocation: {
    type: Object,
    default: null,
  },

  clientLabel: {
    type: String,
    default: 'Votre position',
  },

  // Chaque prestataire doit porter id, latitude, longitude ; nom,
  // service et distance sont utilisés s'ils sont fournis, jamais
  // fabriqués sinon.
  providers: {
    type: Array,
    default: () => [],
  },

  // Rayon réellement utilisé par la recherche (même valeur que
  // rayon_km envoyé à l'API) : dessine un cercle de cette taille,
  // aucun autre calcul de proximité n'est refait ici.
  rayonKm: {
    type: Number,
    default: null,
  },

  // Centre utilisé UNIQUEMENT tant qu'aucune position client n'est connue
  // et qu'aucun prestataire n'a de coordonnées : permet à la carte de
  // rester visible en permanence (ex. accueil) plutôt que de ne
  // s'afficher qu'après activation de la géolocalisation. Jamais utilisé
  // comme position réelle du client ni d'un prestataire.
  centreDefaut: {
    type: Array,
    default: () => [14.6928, -17.4467], // Dakar
  },
})

const emit = defineEmits(['view-profile'])

const mapContainer = ref(null)

let map = null
let clientMarker = null
let clientCircle = null
const providerMarkers = new Map()

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

function providersLocalises() {
  // Un prestataire sans coordonnées valides est ignoré ici : il reste
  // visible dans la liste (gérée par l'appelant), simplement sans
  // marqueur sur la carte.
  const valides = props.providers.filter(
    (provider) => typeof provider.latitude === 'number' && typeof provider.longitude === 'number',
  )

  // Un même prestataire peut apparaître plusieurs fois dans les
  // résultats (une offre par service) : un seul marqueur par
  // prestataire, pas un par offre, sinon des marqueurs identiques se
  // superposent exactement au même endroit.
  const parPrestataire = new Map()
  valides.forEach((provider) => {
    if (!parPrestataire.has(provider.id)) {
      parPrestataire.set(provider.id, provider)
    }
  })

  return Array.from(parPrestataire.values())
}

function cadrerCarte() {
  if (!map) return

  const points = providersLocalises().map((provider) => [provider.latitude, provider.longitude])

  if (props.clientLocation) {
    points.push([props.clientLocation.lat, props.clientLocation.lng])
  }

  if (points.length === 0) return

  if (points.length === 1) {
    map.setView(points[0], 14)
    return
  }

  map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
}

function dessinerClient() {
  if (!map) return

  if (clientMarker) {
    map.removeLayer(clientMarker)
    clientMarker = null
  }
  if (clientCircle) {
    map.removeLayer(clientCircle)
    clientCircle = null
  }

  if (!props.clientLocation) return

  const position = [props.clientLocation.lat, props.clientLocation.lng]

  clientMarker = L.marker(position, { icon: clientIcon })
    .addTo(map)
    .bindPopup(`<strong>${props.clientLabel}</strong>`)

  if (props.rayonKm) {
    clientCircle = L.circle(position, {
      radius: props.rayonKm * 1000,
      color: '#2F6250',
      fillColor: '#2F6250',
      fillOpacity: 0.06,
      weight: 1,
    }).addTo(map)
  }
}

function dessinerPrestataires() {
  if (!map) return

  providerMarkers.forEach((marker) => map.removeLayer(marker))
  providerMarkers.clear()

  providersLocalises().forEach((provider) => {
    const marker = L.marker([provider.latitude, provider.longitude], { icon: providerIcon }).addTo(map)

    const distanceTexte = provider.distance != null ? formaterDistanceKm(provider.distance) : ''
    const nom = provider.nom || provider.name || ''
    const service = provider.service || provider.profession || ''

    // Le clic sur un marqueur ouvre sa popup (comportement natif
    // Leaflet) : elle affiche les informations disponibles, avec un
    // bouton dédié pour naviguer vers le profil — pas de navigation
    // immédiate au simple clic sur le marqueur.
    marker.bindPopup(
      `
      <div class="mimosy-popup">
        ${nom ? `<strong>${nom}</strong><br>` : ''}
        ${service ? `<span>${service}</span><br>` : ''}
        ${distanceTexte ? `<span>${distanceTexte}</span><br>` : ''}
        <button type="button" class="mimosy-popup-bouton" style="margin-top:6px;padding:4px 10px;border-radius:8px;border:none;background:#2F6250;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">
          Voir le profil
        </button>
      </div>
    `,
      // maxWidth/autoPanPadding donnés à Leaflet lui-même (pas juste en
      // CSS) : sur une carte étroite (colonne latérale), il en a besoin
      // pour repositionner correctement la popup et éviter qu'elle ne
      // dépasse du cadre arrondi de la carte.
      { maxWidth: 180, autoPanPadding: [24, 24] },
    )

    marker.on('popupopen', () => {
      const bouton = marker.getPopup()?.getElement()?.querySelector('.mimosy-popup-bouton')
      bouton?.addEventListener('click', () => emit('view-profile', provider), { once: true })
    })

    providerMarkers.set(provider.id, marker)
  })
}

async function initialiser() {
  await nextTick()

  if (!mapContainer.value || map) return

  const vueInitiale = props.clientLocation
    ? [props.clientLocation.lat, props.clientLocation.lng]
    : props.centreDefaut

  map = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView(vueInitiale, props.clientLocation ? 13 : 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  dessinerClient()
  dessinerPrestataires()
  cadrerCarte()

  // Leaflet calcule mal sa taille quand le conteneur était caché au montage
  setTimeout(() => {
    map?.invalidateSize()
  }, 100)
}

function recentrer() {
  cadrerCarte()
}

/** Centre la carte sur un prestataire précis et ouvre sa popup (liste → carte). */
function centrerSur(id) {
  const marker = providerMarkers.get(id)

  if (!marker || !map) return

  map.setView(marker.getLatLng(), 15)
  marker.openPopup()
}

onMounted(initialiser)

watch(
  () => props.providers,
  () => {
    dessinerPrestataires()
    cadrerCarte()
  },
  { deep: true },
)

watch(
  () => props.clientLocation,
  async () => {
    if (!map) {
      await initialiser()
      return
    }
    dessinerClient()
    cadrerCarte()
  },
)

watch(() => props.rayonKm, dessinerClient)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }

  clientMarker = null
  clientCircle = null
  providerMarkers.clear()
})

defineExpose({ centrerSur, recentrer })
</script>

<template>
  <div class="relative h-full min-h-[280px] w-full overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-[#E8ECEB]">
    <div ref="mapContainer" class="absolute inset-0 z-0"></div>

    <button
      type="button"
      class="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#2F6250] shadow-sm transition hover:bg-[#F5F6F4] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
      aria-label="Recentrer la carte"
      title="Recentrer la carte"
      @click="recentrer"
    >
      <svg class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </button>
  </div>
</template>
