<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Lock,
  PenLine,
  UserRound,
  BriefcaseBusiness,
  MapPin,
  Mail,
  Phone,
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import PhotoProfil from '@/components/client/PhotoProfil.vue'
import Loader from '@/components/common/Loader.vue'
import LocationCard from '@/components/profile/LocationCard.vue'
import ProfilModal from '@/components/prestataire/profil/ProfilModal.vue'
import VerificationStatus from '@/components/prestataire/verification/VerificationStatus.vue'

import { useClientProfilStore } from '@/stores/clientProfil'
import * as prestataireService from '@/services/prestataireService'

const profileStore = useClientProfilStore()

const showModal = ref(false)

const profil = ref({
  description: '',
  experience: '',
  disponibilite: true,
  statut_verification: '',
})

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const modalError = ref('')

/*
|--------------------------------------------------------------------------
| Informations du profil
|--------------------------------------------------------------------------
*/

const nom = computed(() => profileStore.nomComplet || 'Prestataire')

const photo = computed(() => profileStore.photoProfil)

const email = computed(() => profileStore.profil.email)

const telephone = computed(() => profileStore.profil.telephone)

const LABELS_STATUT_VERIFICATION = {
  EN_ATTENTE: 'Identité en attente',
  VERIFIE: 'Identité vérifiée',
  REJETE: 'Vérification refusée',
}

const statutLabel = computed(
  () => LABELS_STATUT_VERIFICATION[profil.value.statut_verification] || 'Non renseigné',
)

/*
|--------------------------------------------------------------------------
| Modification du nom
|--------------------------------------------------------------------------
*/

const editionNomOuverte = ref(false)
const prenomEdite = ref('')
const nomEdite = ref('')
const enregistrementNom = ref(false)
const erreurNom = ref('')

function ouvrirEditionNom() {
  prenomEdite.value = profileStore.profil.firstName || ''
  nomEdite.value = profileStore.profil.lastName || ''
  erreurNom.value = ''
  editionNomOuverte.value = true
}

function annulerEditionNom() {
  if (enregistrementNom.value) return

  editionNomOuverte.value = false
  erreurNom.value = ''
}

async function enregistrerNom() {
  if (!prenomEdite.value.trim() || !nomEdite.value.trim()) {
    erreurNom.value = 'Le prénom et le nom sont obligatoires.'
    return
  }

  enregistrementNom.value = true
  erreurNom.value = ''

  try {
    await profileStore.mettreAJourProfil({
      firstName: prenomEdite.value.trim(),
      lastName: nomEdite.value.trim(),
    })

    editionNomOuverte.value = false
  } catch (error) {
    erreurNom.value =
      error?.message || 'Impossible de mettre à jour le nom.'
  } finally {
    enregistrementNom.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Chargement
|--------------------------------------------------------------------------
*/

async function chargerProfil() {
  loading.value = true
  errorMessage.value = ''

  try {
    await profileStore.chargerProfil()

    profil.value =
      await prestataireService.getMyProviderProfile()
  } catch (error) {
    errorMessage.value =
      error?.message || 'Impossible de charger votre profil.'
  } finally {
    loading.value = false
  }
}

onMounted(chargerProfil)

/*
|--------------------------------------------------------------------------
| Modification du profil professionnel
|--------------------------------------------------------------------------
*/

async function save(value) {
  saving.value = true
  modalError.value = ''

  try {
    profil.value =
      await prestataireService.updateMyProviderProfile(value)

    showModal.value = false
  } catch (error) {
    modalError.value =
      error?.message || 'Impossible de mettre à jour le profil.'
  } finally {
    saving.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Photo de profil
|--------------------------------------------------------------------------
*/

async function envoyerPhotoProfil(fichier) {
  try {
    await profileStore.mettreAJourPhoto(fichier)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value =
      error?.message ||
      "Impossible d'envoyer la photo de profil."
  }
}
</script>

<template>
  <AppLayout
    role="prestataire"
    background="#F2F3F0"
  >
    <div
      class="mx-auto flex w-full  flex-col gap-8  pb-12 sm:px-6 lg:px-0"
    >
      <!-- ==========================================================
           EN-TÊTE
      =========================================================== -->


  <header class="flex flex-col gap-2">
    <h1
      class="font-['Instrument_Serif'] text-[42px] leading-[48px] text-[#1A1C1A] sm:text-[48px]"
    >
      Profil et paramètres
    </h1>

    <p class="max-w-2xl text-sm leading-6 text-[#7A847E] sm:text-base">
      Gérez vos informations personnelles et votre profil professionnel.
    </p>
  </header>

  <!-- ==========================================================
       CHARGEMENT
  =========================================================== -->

  <Loader v-if="loading" />

  <!-- ==========================================================
       ERREUR
  =========================================================== -->

  <div
    v-else-if="errorMessage"
    class="border border-[#E7B8B2] bg-[#FFF0EE] p-5"
  >
    <p class="text-sm leading-6 text-[#A85148]">
      {{ errorMessage }}
    </p>

    <button
      type="button"
      class="mt-4 border border-[#A85148] px-4 py-2 text-sm font-medium text-[#A85148] transition hover:bg-[#F7DBDB]"
      @click="chargerProfil"
    >
      Réessayer
    </button>
  </div>

  <template v-else>
    <!-- ========================================================
         PROFIL PRINCIPAL
    ========================================================= -->

    <section
      class="border border-[#E5E7E2] bg-[#FAFAF8]"
    >
      <div
        class="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- Identité -->

        <div class="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <PhotoProfil
            :photo="photo"
            :name="nom"
            size="large"
            @selected="envoyerPhotoProfil"
          />

          <div class="min-w-0 flex-1">
            <!-- Nom -->

            <div
              v-if="!editionNomOuverte"
              class="flex flex-wrap items-center gap-3"
            >
              <h2
                class="truncate text-2xl font-semibold text-[#1A1C1A] sm:text-3xl"
              >
                {{ nom }}
              </h2>

              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center border border-[#E5E7E2] text-[#7A847E] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                aria-label="Modifier le nom"
                @click="ouvrirEditionNom"
              >
                <PenLine class="h-4 w-4" />
              </button>
            </div>

            <!-- Formulaire nom -->

            <form
              v-else
              class="flex max-w-xl flex-col gap-3"
              @submit.prevent="enregistrerNom"
            >
              <div class="grid gap-3 sm:grid-cols-2">
                <input
                  v-model="prenomEdite"
                  type="text"
                  placeholder="Prénom"
                  class="h-11 border border-[#E5E7E2] bg-white px-3 text-sm text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F]"
                />

                <input
                  v-model="nomEdite"
                  type="text"
                  placeholder="Nom"
                  class="h-11 border border-[#E5E7E2] bg-white px-3 text-sm text-[#1A1C1A] outline-none transition focus:border-[#2D6A4F]"
                />
              </div>

              <p
                v-if="erreurNom"
                class="text-sm text-[#A85148]"
              >
                {{ erreurNom }}
              </p>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="border border-[#E5E7E2] px-4 py-2 text-sm font-medium text-[#1A1C1A] transition hover:bg-[#F2F3F0]"
                  @click="annulerEditionNom"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  :disabled="enregistrementNom"
                  class="bg-[#2D6A4F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#24573F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {{
                    enregistrementNom
                      ? 'Enregistrement...'
                      : 'Enregistrer'
                  }}
                </button>
              </div>
            </form>

            <!-- Description -->

            <p
              v-if="!editionNomOuverte"
              class="mt-2 max-w-2xl text-sm leading-6 text-[#7A847E]"
            >
              {{
                profil.description ||
                'Aucune description professionnelle renseignée.'
              }}
            </p>

            <!-- Statuts -->

            <div
              v-if="!editionNomOuverte"
              class="mt-4 flex flex-wrap gap-2"
            >
              <span
                class="inline-flex items-center border border-[#B9DDCB] bg-[#EAF8F2] px-3 py-1.5 text-xs font-medium text-[#16805B]"
              >
                {{ profil.disponibilite ? 'Disponible' : 'Indisponible' }}
              </span>

              <span
                class="inline-flex items-center border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-1.5 text-xs font-medium text-[#64716B]"
              >
                {{ statutLabel }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action principale -->

        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-2 bg-[#2D6A4F] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#24573F]"
          @click="showModal = true"
        >
          <PenLine class="h-4 w-4" />
          Modifier mon profil
        </button>
      </div>
    </section>

    <!-- ========================================================
         GRILLE INFORMATIONS
    ========================================================= -->

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Compte -->

      <section
        class="border border-[#E5E7E2] bg-[#FAFAF8] p-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div
              class="mb-3 flex h-10 w-10 items-center justify-center bg-[#E2EAE4] text-[#2D6A4F]"
            >
              <UserRound class="h-5 w-5" />
            </div>

            <h2
              class="text-lg font-semibold text-[#1A1C1A]"
            >
              Informations de compte
            </h2>

            <p class="mt-1 text-sm leading-5 text-[#7A847E]">
              Les informations utilisées pour votre compte MIMOSY.
            </p>
          </div>
        </div>

        <div
          class="mt-6 border border-[#E5E7E2] bg-[#F2F3F0] p-4"
        >
          <div class="flex gap-3">
            <Lock
              class="mt-0.5 h-4 w-4 shrink-0 text-[#7A847E]"
            />

            <p class="text-xs leading-5 text-[#7A847E]">
              Ces informations sont protégées. Leur modification
              dépend des mécanismes de sécurité disponibles sur
              votre compte.
            </p>
          </div>
        </div>

        <dl class="mt-6 divide-y divide-[#E5E7E2]">
          <div class="flex gap-4 py-4 first:pt-0">
            <Mail class="mt-0.5 h-4 w-4 shrink-0 text-[#7A847E]" />

            <div class="min-w-0">
              <dt class="text-xs font-medium uppercase tracking-wide text-[#8A938E]">
                Email
              </dt>

              <dd
                class="mt-1 break-all text-sm font-medium text-[#1A1C1A]"
              >
                {{ email || 'Non renseigné' }}
              </dd>
            </div>
          </div>

          <div class="flex gap-4 py-4 last:pb-0">
            <Phone class="mt-0.5 h-4 w-4 shrink-0 text-[#7A847E]" />

            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-[#8A938E]">
                Téléphone
              </dt>

              <dd class="mt-1 text-sm font-medium text-[#1A1C1A]">
                {{ telephone || 'Non renseigné' }}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <!-- Expérience -->

      <section
        class="border border-[#E5E7E2] bg-[#FAFAF8] p-6"
      >
        <div
          class="mb-3 flex h-10 w-10 items-center justify-center bg-[#E2EAE4] text-[#2D6A4F]"
        >
          <BriefcaseBusiness class="h-5 w-5" />
        </div>

        <h2
          class="text-lg font-semibold text-[#1A1C1A]"
        >
          Expérience professionnelle
        </h2>

        <p class="mt-1 text-sm leading-5 text-[#7A847E]">
          Présentez votre expérience pour aider les clients à
          mieux comprendre votre parcours.
        </p>

        <div class="mt-6 border-l-2 border-[#2D6A4F] pl-4">
          <p
            v-if="profil.experience"
            class="text-sm leading-7 text-[#3F4944]"
          >
            {{ profil.experience }}
          </p>

          <p
            v-else
            class="text-sm leading-6 text-[#8A938E]"
          >
            Aucune expérience professionnelle renseignée.
          </p>
        </div>

        <button
          type="button"
          class="mt-6 text-sm font-medium text-[#2D6A4F] transition hover:text-[#24573F]"
          @click="showModal = true"
        >
          Modifier mon expérience
        </button>
      </section>
    </div>

    <!-- ========================================================
         LOCALISATION
    ========================================================= -->

    <section
      class="border border-[#E5E7E2] bg-[#FAFAF8]"
    >
      <div
        class="border-b border-[#E5E7E2] px-6 py-5"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center bg-[#E2EAE4] text-[#2D6A4F]"
          >
            <MapPin class="h-5 w-5" />
          </div>

          <div>
            <h2
              class="text-lg font-semibold text-[#1A1C1A]"
            >
              Ma localisation
            </h2>

            <p class="text-sm text-[#7A847E]">
              Gérez la localisation utilisée pour vos prestations.
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <LocationCard />
      </div>
    </section>

    <!-- ========================================================
         VÉRIFICATION
    ========================================================= -->

    <VerificationStatus :statut-verification="profil.statut_verification" />
  </template>

  <!-- ==========================================================
       MODALE PROFIL
  =========================================================== -->

  <ProfilModal
    v-model="showModal"
    :profil="profil"
    :is-saving="saving"
    :error-message="modalError"
    @save="save"
  />
</div>

  </AppLayout>
</template>
