<script setup>
/**
 * Section "Ma localisation" réutilisée par le profil client et le
 * profil prestataire : saisie manuelle (adresse/ville/quartier) +
 * géolocalisation navigateur pour les coordonnées GPS, enregistrées
 * via l'API de localisation déjà existante (saveLocation), jamais un
 * second service parallèle.
 *
 * Latitude/longitude sont obligatoires côté backend (voir
 * LocalisationSerializer) et ne viennent jamais d'une saisie manuelle
 * ici : seul le bouton "Utiliser ma position" les fournit, pour ne
 * jamais enregistrer une coordonnée inventée. Refuser la permission
 * navigateur ne bloque jamais la saisie du reste du formulaire.
 */
import { onMounted, reactive, ref } from 'vue'
import { MapPin } from 'lucide-vue-next'

import { getMyLocation, saveLocation } from '@/services/locationService'
import { useLocation } from '@/composables/useLocation'

const localisation = ref(null)
const chargement = ref(true)
const erreurChargement = ref('')

const enEdition = ref(false)
const enregistrement = ref(false)
const erreurEnregistrement = ref('')
const succesEnregistrement = ref('')

const form = reactive({ adresse: '', ville: '', quartier: '', latitude: null, longitude: null })

const { loading: gpsChargement, error: gpsErreur, requestLocation } = useLocation()

async function charger() {
  chargement.value = true
  erreurChargement.value = ''
  try {
    localisation.value = await getMyLocation()
  } catch (error) {
    erreurChargement.value = error.message || 'Impossible de charger votre localisation.'
  } finally {
    chargement.value = false
  }
}

onMounted(charger)

function activerEdition() {
  form.adresse = localisation.value?.adresse || ''
  form.ville = localisation.value?.ville || ''
  form.quartier = localisation.value?.quartier || ''
  form.latitude = localisation.value?.latitude != null ? Number(localisation.value.latitude) : null
  form.longitude = localisation.value?.longitude != null ? Number(localisation.value.longitude) : null
  erreurEnregistrement.value = ''
  succesEnregistrement.value = ''
  enEdition.value = true
}

function annulerEdition() {
  enEdition.value = false
  erreurEnregistrement.value = ''
}

async function utiliserPosition() {
  try {
    const position = await requestLocation()
    form.latitude = position.latitude
    form.longitude = position.longitude
  } catch {
    // gpsErreur (du composable) affiche déjà le message adapté ; le formulaire reste utilisable.
  }
}

async function enregistrer() {
  erreurEnregistrement.value = ''

  if (!form.adresse.trim() || !form.ville.trim() || !form.quartier.trim()) {
    erreurEnregistrement.value = 'Adresse, ville et quartier sont obligatoires.'
    return
  }
  if (form.latitude == null || form.longitude == null) {
    erreurEnregistrement.value = 'Utilisez « Utiliser ma position » au moins une fois pour enregistrer des coordonnées.'
    return
  }

  enregistrement.value = true
  try {
    localisation.value = await saveLocation({
      adresse: form.adresse.trim(),
      ville: form.ville.trim(),
      quartier: form.quartier.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
    })
    succesEnregistrement.value = 'Localisation enregistrée.'
    enEdition.value = false
  } catch (error) {
    erreurEnregistrement.value = error.message || "Impossible d'enregistrer la localisation."
  } finally {
    enregistrement.value = false
  }
}

function formaterDate(date) {
  if (!date) return ''
  const formatee = new Date(date)
  if (Number.isNaN(formatee.getTime())) return ''
  return formatee.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <section class="rounded-[8px] border border-[#E2E8F0] bg-white p-5  sm:p-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF3ED] text-[#2F6250]">
          <MapPin class="h-5 w-5" />
        </span>
        <div>
          <h2 class="text-lg font-extrabold text-[#051F20]">Ma localisation</h2>
          <p class="text-sm text-[#64748B]">Utilisée pour la recherche par proximité et la carte.</p>
        </div>
      </div>

      <button
        v-if="!enEdition"
        type="button"
        class="rounded-[10px] border border-[#2F6250] px-3 py-2 text-xs font-bold text-[#2F6250] transition hover:bg-[#EAF8F2]"
        @click="activerEdition"
      >
        {{ localisation ? 'Modifier' : 'Ajouter' }}
      </button>
    </div>

    <div v-if="chargement" class="mt-5 text-sm text-[#64748B]">Chargement de votre localisation...</div>
    <div v-else-if="erreurChargement" class="mt-5 rounded-[8px] bg-[#FFF0EE] p-4 text-sm text-[#C53B35]">{{ erreurChargement }}</div>

    <!-- Lecture -->
    <div v-else-if="!enEdition && localisation" class="mt-5 space-y-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Adresse</p>
        <p class="mt-1 font-semibold text-[#051F20]">{{ localisation.adresse }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Quartier</p>
          <p class="mt-1 font-semibold text-[#051F20]">{{ localisation.quartier }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Ville</p>
          <p class="mt-1 font-semibold text-[#051F20]">{{ localisation.ville }}</p>
        </div>
      </div>
      <div v-if="localisation.updated_at" class="border-t border-[#F1F5F9] pt-3">
        <p class="text-xs text-[#94A3B8]">Dernière mise à jour : {{ formaterDate(localisation.updated_at) }}</p>
      </div>
    </div>

    <div v-else-if="!enEdition" class="mt-5 rounded-[8px] border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">
      Aucune localisation enregistrée. Cliquez sur « Ajouter » pour la renseigner.
    </div>

    <!-- Édition -->
    <form v-else class="mt-5 flex flex-col gap-4" @submit.prevent="enregistrer">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Adresse</span>
        <input v-model="form.adresse" type="text" placeholder="Ex. Villa 12, Sacré-Cœur 3" class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10" />
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Quartier</span>
          <input v-model="form.quartier" type="text" class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]">Ville</span>
          <input v-model="form.ville" type="text" class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10" />
        </label>
      </div>

      <div class="rounded-[10px] bg-[#F8FAFC] p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-[#051F20]">Coordonnées GPS</p>
            <p class="mt-0.5 text-xs text-[#64748B]">
              {{ form.latitude != null && form.longitude != null ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}` : 'Aucune position récupérée pour le moment.' }}
            </p>
          </div>
          <button
            type="button"
            :disabled="gpsChargement"
            class="rounded-[10px] border border-[#2F6250] px-3 py-2 text-xs font-bold text-[#2F6250] transition hover:bg-[#EAF8F2] disabled:opacity-60"
            @click="utiliserPosition"
          >
            {{ gpsChargement ? 'Récupération...' : 'Utiliser ma position' }}
          </button>
        </div>
        <p v-if="gpsErreur" class="mt-2 text-xs font-semibold text-[#C53B35]">{{ gpsErreur }}</p>
      </div>

      <p v-if="erreurEnregistrement" class="rounded-[8px] bg-[#FFF0EE] p-3 text-sm text-[#C53B35]">{{ erreurEnregistrement }}</p>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" :disabled="enregistrement" class="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-bold text-[#334155] transition hover:bg-[#F8FAFC]" @click="annulerEdition">
          Annuler
        </button>
        <button type="submit" :disabled="enregistrement" class="rounded-[10px] bg-[#2F6250] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244B3D] disabled:cursor-not-allowed disabled:bg-[#A8B6AF]">
          {{ enregistrement ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </form>

    <p v-if="succesEnregistrement && !enEdition" class="mt-3 text-sm font-semibold text-[#16805B]">{{ succesEnregistrement }}</p>
  </section>
</template>
