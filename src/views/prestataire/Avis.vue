
<script setup>
import { computed, onMounted, ref } from 'vue'

import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AvisCard from '@/components/prestataire/avis/AvisCard.vue'
import AvisSummary from '@/components/prestataire/avis/AvisSummary.vue'

import { useAuthStore } from '@/stores/auth'
import * as reviewService from '@/services/reviewService'

const authStore = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const avis = ref([])

const userName = computed(() =>
  [
    authStore.user?.first_name,
    authStore.user?.last_name,
  ]
    .filter(Boolean)
    .join(' ') || 'Prestataire',
)

const avisVisibles = computed(() =>
  avis.value
    .filter((item) => item?.statut === 'PUBLIE')
    .map((item) => {
      const prestation = item?.prestation

      const prestationId =
        typeof prestation === 'object'
          ? prestation?.id
          : prestation

      const prestationService =
        typeof prestation === 'object'
          ? (
              prestation?.service_nom ||
              prestation?.service?.nom ||
              prestation?.service?.name ||
              prestation?.service ||
              'Prestation MIMOSY'
            )
          : prestation
            ? `Prestation ${String(prestation).slice(0, 8)}`
            : 'Prestation MIMOSY'

      return {
        ...item,
        client: {
          id: item?.auteur,
          nom: item?.auteur
            ? `Client #${item.auteur}`
            : 'Client MIMOSY',
          photo: null,
        },
        prestation: {
          id: prestationId,
          service: prestationService,
        },
        dateAvis: item?.date_creation || null,
      }
    }),
)

const noteMoyenne = computed(() => {
  if (!avisVisibles.value.length) {
    return '0,0'
  }

  const total = avisVisibles.value.reduce(
    (somme, item) => somme + Number(item?.note || 0),
    0,
  )

  return (total / avisVisibles.value.length)
    .toFixed(1)
    .replace('.', ',')
})

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await reviewService.listReviews()

    console.log('AVIS API :', data)

    avis.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : []
  } catch (error) {
    console.error('Erreur lors du chargement des avis :', error)

    errorMessage.value =
      error?.message || 'Impossible de charger les avis.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout role="prestataire">
    <div class="mx-auto flex w-full flex-col gap-7">
      <ClientHeader
        title="Mes avis"
        subtitle="Consultez les évaluations reçues après vos prestations."
        :user-name="userName"
        profile-path="/prestataire/profil"
      />

      <AvisSummary
        :average="noteMoyenne"
        :count="avisVisibles.length"
      />

      <section class="flex flex-col gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-[#1D2521]">
            Historique des avis
          </h2>

          <p class="mt-1 text-sm text-[#69716C]">
            Les avis affichés proviennent de l'API et sont limités aux avis publiés.
          </p>
        </div>

        <div
          v-if="loading"
          class="rounded-2xl border border-[#D9DDD8] bg-white p-8 text-center text-sm text-[#69716C]"
        >
          Chargement des avis...
        </div>

        <div
          v-else-if="errorMessage"
          class="rounded-2xl border border-[#E7B8B2] bg-[#FFF0EE] p-8 text-center text-sm text-[#A85148]"
        >
          {{ errorMessage }}
        </div>

        <EmptyState
          v-else-if="!avisVisibles.length"
          title="Aucun avis publié"
          message="Les avis validés de vos clients apparaîtront ici."
        />

        <div
          v-else
          class="flex flex-col gap-4"
        >
          <AvisCard
            v-for="avisItem in avisVisibles"
            :key="avisItem.id"
            :avis="avisItem"
          />
        </div>
      </section>
    </div>
  </AppLayout>
</template>

