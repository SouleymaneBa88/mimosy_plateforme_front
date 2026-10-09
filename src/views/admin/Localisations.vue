<script setup>
/**
 * Carte admin des localisations réelles (clients et prestataires).
 *
 * N'affiche que des coordonnées réellement enregistrées par les
 * utilisateurs (voir apps.adminpanel.LocalisationAdminViewSet) :
 * aucune position n'est jamais devinée ni générée côté frontend.
 */
// Outils Vue.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Leaflet (cartes) et son CSS.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Composants et appels à l'API admin.
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import Loader from '@/components/common/Loader.vue'
import * as adminService from '@/services/adminService'

// Les localisations, les états, et le filtre par rôle.
const localisations = ref([])
const loading = ref(true)
const errorMessage = ref('')
const filtreRole = ref('')

// La <div> de la carte, la carte Leaflet, et la liste des marqueurs.
const mapContainer = ref(null)
let map = null
const marqueurs = []

// Couleur du point selon le rôle (bleu = client, vert = prestataire).
const couleurParRole = { CLIENT: '#3267B1', PRESTATAIRE: '#2F6250' }

// Crée un petit point coloré pour un rôle.
function creerIcone(role) {
  const couleur = couleurParRole[role] || '#64748B'
  return L.divIcon({
    className: 'mimosy-admin-marker',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${couleur};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// Dessine tous les marqueurs sur la carte.
function dessiner() {
  if (!map) return

  // On efface les anciens marqueurs.
  marqueurs.forEach((marker) => map.removeLayer(marker))
  marqueurs.length = 0

  // Un marqueur par localisation, avec une bulle (nom, rôle, quartier, ville).
  localisations.value.forEach((loc) => {
    const marker = L.marker([Number(loc.latitude), Number(loc.longitude)], { icon: creerIcone(loc.role) })
      .addTo(map)
      .bindPopup(`<strong>${loc.nom_complet}</strong><br>${loc.role}<br>${[loc.quartier, loc.ville].filter(Boolean).join(', ')}`)
    marqueurs.push(marker)
  })

  // On zoome pour voir tous les points.
  if (marqueurs.length) {
    map.fitBounds(marqueurs.map((marker) => marker.getLatLng()), { padding: [40, 40], maxZoom: 14 })
  }
}

// Charge les localisations (jusqu'à 500) puis les dessine.
async function charger() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await adminService.listLocalisationsAdmin({ role: filtreRole.value, page_size: 500 })
    localisations.value = Array.isArray(data) ? data : data?.results || []
    await nextTick()
    dessiner()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

// Au montage : on crée la carte, on ajoute le fond OpenStreetMap, puis on charge.
onMounted(() => {
  map = L.map(mapContainer.value).setView([14.6928, -17.4467], 11) // Dakar, ajusté par fitBounds dès que des points existent
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)
  charger()
})

// Quand le filtre change, on recharge.
watch(filtreRole, charger)

// Au démontage : on détruit la carte.
onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full  flex-col gap-6">
      <ClientHeader title="Carte des localisations" subtitle="Répartition géographique réelle des clients et prestataires." />

      <!-- Filtre par rôle. -->
      <select v-model="filtreRole" class="w-fit rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-black">
        <option value="">Tous les rôles</option>
        <option value="CLIENT">Clients</option>
        <option value="PRESTATAIRE">Prestataires</option>
      </select>

      <!-- États : erreur, chargement, vide. -->
      <ErrorState v-if="errorMessage" :message="errorMessage" @retry="charger" />
      <Loader v-else-if="loading && !localisations.length" />
      <EmptyState v-else-if="!loading && !localisations.length" title="Aucune localisation" message="Aucun utilisateur n'a encore renseigné de localisation." />

      <!-- La carte. -->
      <div ref="mapContainer" class="h-[520px] w-full overflow-hidden rounded-2xl border border-[#E2E8F0]"></div>

      <p class="text-sm text-[#68716C]">{{ localisations.length }} localisation(s) affichée(s).</p>
    </div>
  </AppLayout>
</template>
