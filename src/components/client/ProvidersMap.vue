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
// Outils Vue.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Leaflet : la librairie de cartes, et son CSS.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Mise en forme des distances.
import { formaterDistanceKm } from '@/utils/format'

// Props : position du client, libellé, liste des prestataires, rayon, centre par défaut.
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

// Événement envoyé pour ouvrir le profil d'un prestataire.
const emit = defineEmits(['view-profile'])

// Référence vers la <div> qui contient la carte.
const mapContainer = ref(null)

// Variables Leaflet : la carte, le marqueur du client, le cercle du rayon,
// et les marqueurs des prestataires (rangés par identifiant).
let map = null
let clientMarker = null
let clientCircle = null
const providerMarkers = new Map()

// L'icône (rond vert) de la position du client.
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

// L'icône (épingle verte) d'un prestataire.
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

// Ajuste le zoom pour que tous les points soient visibles.
function cadrerCarte() {
  if (!map) return

  // On rassemble les points : prestataires + client.
  const points = providersLocalises().map((provider) => [provider.latitude, provider.longitude])

  if (props.clientLocation) {
    points.push([props.clientLocation.lat, props.clientLocation.lng])
  }

  if (points.length === 0) return

  // Un seul point : on centre dessus.
  if (points.length === 1) {
    map.setView(points[0], 14)
    return
  }

  // Plusieurs points : on zoome pour tous les voir.
  map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
}

// Dessine (ou redessine) la position du client et le cercle du rayon.
function dessinerClient() {
  if (!map) return

  // On efface l'ancien marqueur et l'ancien cercle.
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

  // On ajoute le marqueur du client avec une petite bulle.
  clientMarker = L.marker(position, { icon: clientIcon })
    .addTo(map)
    .bindPopup(`<strong>${props.clientLabel}</strong>`)

  // On dessine le cercle du rayon de recherche (en mètres).
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

// Dessine (ou redessine) les marqueurs des prestataires.
function dessinerPrestataires() {
  if (!map) return

  // On efface tous les anciens marqueurs.
  providerMarkers.forEach((marker) => map.removeLayer(marker))
  providerMarkers.clear()

  // Un marqueur par prestataire localisé.
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

    // Quand la bulle s'ouvre, on branche le bouton "Voir le profil".
    marker.on('popupopen', () => {
      const bouton = marker.getPopup()?.getElement()?.querySelector('.mimosy-popup-bouton')
      bouton?.addEventListener('click', () => emit('view-profile', provider), { once: true })
    })

    providerMarkers.set(provider.id, marker)
  })
}

// Crée la carte (une seule fois).
async function initialiser() {
  // On attend que la <div> soit bien affichée.
  await nextTick()

  if (!mapContainer.value || map) return

  // Point de départ : la position du client, sinon Dakar.
  const vueInitiale = props.clientLocation
    ? [props.clientLocation.lat, props.clientLocation.lng]
    : props.centreDefaut

  // On crée la carte Leaflet.
  map = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView(vueInitiale, props.clientLocation ? 13 : 12)

  // On ajoute le fond de carte OpenStreetMap.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  // On dessine tout, puis on cadre.
  dessinerClient()
  dessinerPrestataires()
  cadrerCarte()

  // Leaflet calcule mal sa taille quand le conteneur était caché au montage
  setTimeout(() => {
    map?.invalidateSize()
  }, 100)
}

// Bouton "Recentrer".
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

// Crée la carte au montage.
onMounted(initialiser)

// Quand la liste des prestataires change : on redessine.
watch(
  () => props.providers,
  () => {
    dessinerPrestataires()
    cadrerCarte()
  },
  { deep: true },
)

// Quand la position du client change : on crée la carte si besoin, sinon on redessine.
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

// Quand le rayon change : on redessine le cercle.
watch(() => props.rayonKm, dessinerClient)

// Au démontage : on détruit la carte proprement.
onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }

  clientMarker = null
  clientCircle = null
  providerMarkers.clear()
})

// Fonctions accessibles depuis le parent (via une ref).
defineExpose({ centrerSur, recentrer })
</script>

<template>
  <div class="relative h-full min-h-[280px] w-full overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-[#E8ECEB]">
    <!-- La zone où Leaflet dessine la carte. -->
    <div ref="mapContainer" class="absolute inset-0 z-0"></div>

    <!-- Bouton pour recentrer la carte. -->
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
