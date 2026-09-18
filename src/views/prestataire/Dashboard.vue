<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import * as prestataireService from '@/services/prestataireService'
import * as reviewService from '@/services/reviewService'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const offres = ref([])
const avis = ref([])
const userName = computed(() => [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ') || 'Prestataire')

const avisPublies = computed(() => avis.value.filter((item) => item.statut === 'PUBLIE'))
const noteMoyenne = computed(() => {
  if (!avisPublies.value.length) return '0,0 / 5'
  const total = avisPublies.value.reduce((sum, item) => sum + item.note, 0)
  return `${(total / avisPublies.value.length).toFixed(1).replace('.', ',')} / 5`
})
const stats = computed(() => [
  { label: 'Offres disponibles', value: offres.value.filter((item) => item.disponible).length },
  { label: 'Avis publiés', value: avisPublies.value.length },
  { label: 'Note moyenne', value: noteMoyenne.value },
])

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [offersData, reviewsData] = await Promise.all([
      prestataireService.listMyServiceOffers(),
      reviewService.listReviews(),
    ])
    offres.value = Array.isArray(offersData) ? offersData : offersData?.results || []
    avis.value = Array.isArray(reviewsData) ? reviewsData : reviewsData?.results || []
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
})
</script>
<template>
<AppLayout role="prestataire">
    <div class="mx-auto flex w-full  flex-col gap-7">
        <ClientHeader title="Tableau de bord" subtitle="Gérez votre activité et vos interventions." :user-name="userName" profile-path="/prestataire/profil" />
        <div v-if="loading" class="p-8 text-center">Chargement...</div>
        <div v-else-if="error" class="rounded-xl bg-[#FFF0EE] p-4 text-[#A85148]">{{ error }}</div>
        <template v-else><div class="grid gap-4 sm:grid-cols-3">
            <div v-for="stat in stats" :key="stat.label" class="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            ><p class="text-sm text-[#64748B]">{{ stat.label }}</p>
            <p class="mt-2 text-2xl font-extrabold text-[#051F20]">{{ stat.value }}</p>
            </div>
        </div>
            <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section class="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-extrabold text-[#051F20]">Demandes récentes</h2>
                        <button type="button" class="text-sm font-bold text-[#2F6250]" @click="router.push('/prestataire/demandes')">Voir tout</button>
                        </div>
                        <EmptyState class="mt-4" title="Endpoint indisponible" message="Le backend n'expose pas encore les demandes reçues par le prestataire." />
                                </section>
                                <section class="rounded-2xl bg-[#051F20] p-6 text-white">
                                    <h2 class="text-lg font-extrabold">Offres actives</h2>
                                    <p class="mt-5 text-4xl font-extrabold">{{ offres.filter((item) => item.disponible).length }}</p>
                                    <p class="mt-1 text-[#D9DDD8]">Services proposés et disponibles dans le catalogue.</p>
                                    <button type="button" class="mt-6 w-full rounded-xl bg-white py-3 text-sm font-bold text-[#051F20]" @click="router.push('/prestataire/services')">Gérer mes prestations</button>
                                    </section>
                                    </div>
                                    </template>
                                    </div>
                                    </AppLayout>
                                    </template>
