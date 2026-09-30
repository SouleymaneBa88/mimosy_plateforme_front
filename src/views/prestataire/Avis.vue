<!--
  Page "Avis" du prestataire : la note moyenne, le nombre d'avis,
  et la liste des avis publiés par ses clients.
-->
<script setup>
// Outils Vue.
import { computed, onMounted, ref } from 'vue'

// Les composants de la page.
import AppLayout from '@/components/layout/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AvisCard from '@/components/prestataire/avis/AvisCard.vue'
import AvisSummary from '@/components/prestataire/avis/AvisSummary.vue'

// Le store de connexion et les appels à l'API des avis.
import { useAuthStore } from '@/stores/auth'
import * as reviewService from '@/services/reviewService'

// Le store de connexion (pour le nom du prestataire).
const authStore = useAuthStore()

// État de chargement, message d'erreur, et la liste brute des avis.
const loading = ref(false)
const errorMessage = ref('')
const avis = ref([])

/*
|--------------------------------------------------------------------------
| Utilisateur connecté
|--------------------------------------------------------------------------
*/

// Le nom du prestataire connecté.
const userName = computed(() => {
  const parts = [
    authStore.user?.first_name,
    authStore.user?.last_name,
  ].filter(Boolean)

  return parts.join(' ') || 'Prestataire'
})

/*
|--------------------------------------------------------------------------
| Avis publiés
|--------------------------------------------------------------------------
|
| On conserve uniquement les avis réellement publiés par l'API.
|
*/

const avisVisibles = computed(() =>
  avis.value
    .filter((item) => item?.statut === 'PUBLIE')
    .map((item) => {
      // On récupère l'identifiant et le nom du service de la prestation (objet ou simple id).
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
              null
            )
          : null

      return {
        ...item,

        /*
         * On ne fabrique pas de nom ou d'identifiant client.
         * Si l'API ne fournit pas le nom, AvisCard devra gérer
         * l'absence de cette information.
         */
        client: {
          id: item?.auteur || null,
          nom: item?.auteur_nom || item?.auteur_name || null,
          photo: item?.auteur_photo || null,
        },

        prestation: {
          id: prestationId || null,
          service: prestationService,
        },

        dateAvis: item?.date_creation || null,
      }
    }),
)

/*
|--------------------------------------------------------------------------
| Note moyenne
|--------------------------------------------------------------------------
*/

const noteMoyenne = computed(() => {
  if (!avisVisibles.value.length) {
    return '0,0'
  }

  // On garde seulement les notes valides.
  const notes = avisVisibles.value
    .map((item) => Number(item?.note))
    .filter((note) => Number.isFinite(note))

  if (!notes.length) {
    return '0,0'
  }

  // Somme des notes, puis moyenne avec une décimale et une virgule (ex. "4,5").
  const total = notes.reduce(
    (somme, note) => somme + note,
    0,
  )

  return (total / notes.length)
    .toFixed(1)
    .replace('.', ',')
})

/*
|--------------------------------------------------------------------------
| Chargement des avis
|--------------------------------------------------------------------------
*/

async function chargerAvis() {
  loading.value = true
  errorMessage.value = ''

  try {
    // On accepte une liste simple ou une réponse paginée.
    const data = await reviewService.listReviews()

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
}

// On charge les avis au montage.
onMounted(chargerAvis)
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div
      class="mx-auto flex w-full  flex-col gap-10  pb-5 sm:px-6 lg:px-0"
    >
      <!-- ==========================================================
           EN-TÊTE
      =========================================================== -->

```
  <header class="flex flex-col gap-2">
    <h1
      class="font-['Instrument_Serif'] text-[42px] leading-[48px] text-[#1A1C1A] sm:text-[48px]"
    >
      Mes avis
    </h1>

    <p
      class="max-w-2xl text-sm leading-6 text-[#7A847E] sm:text-base"
    >
      Consultez les évaluations laissées par vos clients après
      vos prestations.
    </p>
  </header>

  <!-- ==========================================================
       RÉSUMÉ
  =========================================================== -->

  <section>
    <AvisSummary
      :average="noteMoyenne"
      :count="avisVisibles.length"
    />
  </section>

  <!-- ==========================================================
       HISTORIQUE
  =========================================================== -->

  <section class="flex flex-col gap-6">
    <div
      class="flex flex-col gap-1 border-b border-[#E5E7E2] pb-5"
    >
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2
            class="font-['Instrument_Serif'] text-[28px] leading-8 text-[#1C2420]"
          >
            Historique des avis
          </h2>

          <p class="mt-1 text-sm leading-5 text-[#7A847E]">
            Retrouvez ici les avis publiés sur votre profil.
          </p>
        </div>

        <span
          v-if="!loading"
          class="text-sm text-[#7A847E]"
        >
          {{ avisVisibles.length }}
          {{ avisVisibles.length > 1 ? 'avis' : 'avis' }}
        </span>
      </div>
    </div>

    <!-- ========================================================
         CHARGEMENT
    ========================================================= -->

    <div
      v-if="loading"
      class="border border-[#E5E7E2] bg-[#FAFAF8] p-8"
    >
      <div class="flex flex-col items-center justify-center gap-4">
        <div
          class="h-7 w-7 animate-spin rounded-full border-2 border-[#E5E7E2] border-t-[#2D6A4F]"
        />

        <p class="text-sm text-[#7A847E]">
          Chargement de vos avis...
        </p>
      </div>
    </div>

    <!-- ========================================================
         ERREUR
    ========================================================= -->

    <div
      v-else-if="errorMessage"
      class="border border-[#E7B8B2] bg-[#FFF0EE] p-6"
    >
      <div class="flex flex-col gap-3">
        <h3
          class="text-sm font-semibold text-[#A85148]"
        >
          Impossible de charger les avis
        </h3>

        <p
          class="text-sm leading-5 text-[#A85148]"
        >
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="self-start border border-[#A85148] px-4 py-2 text-sm font-medium text-[#A85148] transition hover:bg-[#F7DBDB]"
          @click="chargerAvis"
        >
          Réessayer
        </button>
      </div>
    </div>

    <!-- ========================================================
         AUCUN AVIS
    ========================================================= -->

    <EmptyState
      v-else-if="!avisVisibles.length"
      title="Aucun avis publié"
      message="Les avis validés de vos clients apparaîtront ici après vos prestations."
    />

    <!-- ========================================================
         LISTE DES AVIS
    ========================================================= -->

    <div
      v-else
      class="flex flex-col gap-4"
    >
      <article
        v-for="avisItem in avisVisibles"
        :key="avisItem.id"
        class="border border-[#E5E7E2] bg-[#FAFAF8] transition hover:border-[#D5DAD5]"
      >
        <AvisCard :avis="avisItem" />
      </article>
    </div>
  </section>
</div>
```

  </AppLayout>
</template>
