<script setup>
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ClientHeader from '@/components/client/ClientHeader.vue'
import Loader from '@/components/common/Loader.vue'
import ProfilModal from '@/components/prestataire/profil/ProfilModal.vue'
import { useClientProfilStore } from '@/stores/clientProfil'
import * as prestataireService from '@/services/prestataireService'

const profileStore = useClientProfilStore()
const showModal = ref(false)
const profil = ref({ description: '', experience: '', disponibilite: true, statut_verification: '' })
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const modalError = ref('')

const nom = computed(() => profileStore.nomComplet || 'Prestataire')
const photo = computed(() => profileStore.photoProfil)
const statutLabel = computed(() => profil.value.statut_verification || 'Non renseigné')

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    await profileStore.chargerProfil()
    profil.value = await prestataireService.getMyProviderProfile()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
})

async function save(value) {
  saving.value = true
  modalError.value = ''
  try {
    profil.value = await prestataireService.updateMyProviderProfile(value)
    showModal.value = false
  } catch (error) {
    modalError.value = error.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout role="prestataire">
    <div class="mx-auto flex w-full flex-col gap-7">
      <ClientHeader title="Profil et paramètres" subtitle="Gérez votre profil professionnel." :user-name="nom" profile-path="/prestataire/profil" />

      <Loader v-if="loading" />
      <p v-else-if="errorMessage" class="rounded-xl bg-[#FFF0EE] p-4 text-sm text-[#A85148]">{{ errorMessage }}</p>
      <template v-else>
        <section class="flex flex-col gap-6 rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:flex-row sm:items-center">
          <img v-if="photo" :src="photo" :alt="nom" class="h-28 w-28 rounded-2xl object-cover" />
          <div v-else class="flex h-28 w-28 items-center justify-center rounded-2xl bg-[#EAF8F2] text-3xl font-extrabold text-[#2F6250]">
            {{ nom.charAt(0) }}
          </div>
          <div class="flex-1">
            <h1 class="text-2xl font-extrabold text-[#051F20]">{{ nom }}</h1>
            <p class="mt-1 text-[#64748B]">{{ profil.description || 'Description professionnelle non renseignée.' }}</p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-[#EAF8F2] px-3 py-1 text-sm font-bold text-[#16805B]">
                {{ profil.disponibilite ? 'Disponible' : 'Indisponible' }}
              </span>
              <span class="rounded-full bg-[#F1F5F9] px-3 py-1 text-sm font-bold text-[#64748B]">{{ statutLabel }}</span>
            </div>
          </div>
          <button type="button" class="rounded-xl bg-[#2F6250] px-4 py-3 text-sm font-bold text-white" @click="showModal = true">Modifier mon profil</button>
        </section>

        <section class="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 class="font-extrabold text-[#051F20]">Expérience</h2>
          <p class="mt-3 text-sm leading-6 text-[#64748B]">{{ profil.experience || 'Aucune expérience renseignée.' }}</p>
        </section>
      </template>

      <ProfilModal v-model="showModal" :profil="profil" :is-saving="saving" :error-message="modalError" @save="save" />
    </div>
  </AppLayout>
</template>
