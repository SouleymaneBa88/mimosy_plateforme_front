<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, X, Trash2 } from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useRendezVousStore } from '@/stores/rendezVous'

const authStore = useAuthStore()
const rdvStore = useRendezVousStore()

const userName = computed(
  () =>
    [authStore.user?.first_name, authStore.user?.last_name]
      .filter(Boolean)
      .join(' ') || 'Prestataire',
)

/*
|--------------------------------------------------------------------------
| Jours de la semaine
|--------------------------------------------------------------------------
*/

const joursSemaine = [
  { valeur: 0, label: 'Lundi' },
  { valeur: 1, label: 'Mardi' },
  { valeur: 2, label: 'Mercredi' },
  { valeur: 3, label: 'Jeudi' },
  { valeur: 4, label: 'Vendredi' },
  { valeur: 5, label: 'Samedi' },
  { valeur: 6, label: 'Dimanche' },
]

/*
|--------------------------------------------------------------------------
| Disponibilités groupées par jour
|--------------------------------------------------------------------------
*/

const disponibilitesParJour = computed(() => {
  const groupes = new Map(
    joursSemaine.map((jour) => [jour.valeur, []]),
  )

  rdvStore.disponibilites.forEach((disponibilite) => {
    if (groupes.has(disponibilite.jour_semaine)) {
      groupes.get(disponibilite.jour_semaine).push(disponibilite)
    }
  })

  return joursSemaine.map((jour) => ({
    ...jour,
    disponibilites: groupes.get(jour.valeur) || [],
  }))
})

/*
|--------------------------------------------------------------------------
| Formulaire popup
|--------------------------------------------------------------------------
*/

const formulaireOuvert = ref(false)
const disponibiliteEnEdition = ref(null)
const formulaireEnvoi = ref(false)
const formulaireErreur = ref('')

const formulaireDispo = reactive({
  jour_semaine: 0,
  heure_debut: '',
  heure_fin: '',
})

function ouvrirAjout(jour = 0) {
  disponibiliteEnEdition.value = null

  formulaireDispo.jour_semaine = jour
  formulaireDispo.heure_debut = ''
  formulaireDispo.heure_fin = ''

  formulaireErreur.value = ''
  formulaireOuvert.value = true
}

function ouvrirEdition(disponibilite) {
  disponibiliteEnEdition.value = disponibilite

  formulaireDispo.jour_semaine = disponibilite.jour_semaine
  formulaireDispo.heure_debut = disponibilite.heure_debut
    ? disponibilite.heure_debut.slice(0, 5)
    : ''
  formulaireDispo.heure_fin = disponibilite.heure_fin
    ? disponibilite.heure_fin.slice(0, 5)
    : ''

  formulaireErreur.value = ''
  formulaireOuvert.value = true
}

function fermerFormulaire() {
  if (formulaireEnvoi.value) return

  formulaireOuvert.value = false
  disponibiliteEnEdition.value = null
  formulaireErreur.value = ''
}

async function soumettreFormulaire() {
  formulaireErreur.value = ''

  if (!formulaireDispo.heure_debut || !formulaireDispo.heure_fin) {
    formulaireErreur.value =
      'Veuillez renseigner une heure de début et une heure de fin.'
    return
  }

  if (formulaireDispo.heure_fin <= formulaireDispo.heure_debut) {
    formulaireErreur.value =
      "L'heure de fin doit être supérieure à l'heure de début."
    return
  }

  formulaireEnvoi.value = true

  try {
    const payload = {
      jour_semaine: Number(formulaireDispo.jour_semaine),
      heure_debut: formulaireDispo.heure_debut,
      heure_fin: formulaireDispo.heure_fin,
    }

    if (disponibiliteEnEdition.value) {
      await rdvStore.modifierDisponibilite(
        disponibiliteEnEdition.value.id,
        payload,
      )
    } else {
      await rdvStore.creerDisponibilite(payload)
    }

    fermerFormulaire()
  } catch (error) {
    formulaireErreur.value =
      error?.message || "Impossible d'enregistrer la disponibilité."
  } finally {
    formulaireEnvoi.value = false
  }
}

/*
|--------------------------------------------------------------------------
| Suppression
|--------------------------------------------------------------------------
*/

async function supprimerDisponibilite(disponibilite) {
  const confirmation = window.confirm(
    'Voulez-vous vraiment supprimer cette disponibilité ?',
  )

  if (!confirmation) return

  try {
    await rdvStore.supprimerDisponibilite(disponibilite.id)
  } catch (error) {
    console.error(error)
  }
}

/*
|--------------------------------------------------------------------------
| Affichage des horaires
|--------------------------------------------------------------------------
*/

function formatHeure(value) {
  if (!value) return ''
  return value.slice(0, 5)
}

function jourActif(jour) {
  return jour.disponibilites.some(
    (disponibilite) => disponibilite.actif !== false,
  )
}

/*
|--------------------------------------------------------------------------
| Chargement initial
|--------------------------------------------------------------------------
*/

onMounted(async () => {
  await rdvStore.chargerMesDisponibilites().catch(() => {})
})
</script>

<template>
  <AppLayout role="prestataire" background="#F2F3F0">
    <div
      class="mx-auto flex w-full flex-col gap-10 px-4 pb-10 sm:px-6 lg:px-0"
    >
      <!-- En-tête -->

  <div class="flex flex-col gap-2">
    <h1
      class="font-['Instrument_Serif'] text-[42px] leading-[48px] text-[#1A1C1A] sm:text-[48px]"
    >
      Gérez votre emploi du temps
    </h1>

    <p class="max-w-3xl text-sm leading-6 text-[#7A847E] sm:text-base">
      Définissez vos horaires de travail et vos périodes
      d'indisponibilité pour que vos clients puissent réserver au bon
      moment.
    </p>
  </div>

  <!-- ==========================================================
       HORAIRES HEBDOMADAIRES
  =========================================================== -->

  <section
    class="flex flex-col gap-8 border border-[#E5E7E2] bg-[#FAFAF8] p-5 sm:p-8 rounded-2xl"
  >
    <div class="border-b border-[#E5E7E2] pb-6">
      <h2
        class="font-['Instrument_Serif'] text-xl leading-7 text-[#1C2420]"
      >
        Horaires hebdomadaires
      </h2>

      <p class="mt-1 text-sm leading-5 text-[#7A847E]">
        Vos horaires de travail standard pour chaque jour de la semaine.
      </p>
    </div>

    <!-- Chargement -->

    <div
      v-if="rdvStore.isLoadingDisponibilites"
      class="py-10 text-center text-sm text-[#7A847E]"
    >
      Chargement de vos disponibilités...
    </div>

    <!-- Erreur -->

    <div
      v-else-if="rdvStore.disponibilitesErrorMessage"
      class="border border-[#E7B8B2] bg-[#FFF0EE] p-5 text-sm text-[#A85148]"
    >
      {{ rdvStore.disponibilitesErrorMessage }}
    </div>

    <!-- Jours -->

    <div v-else class="flex flex-col">
      <div
        v-for="jour in disponibilitesParJour"
        :key="jour.valeur"
        class="flex flex-col gap-4 border-b border-[#F0F1EE] py-5 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <!-- Jour -->

        <div class="flex items-center gap-4">
          <span
            class="relative h-5 w-10 shrink-0 rounded-full"
            :class="
              jourActif(jour)
                ? 'bg-[#2D6A4F]'
                : 'bg-[#E5E7E2]'
            "
          >
            <span
              class="absolute top-1 h-3 w-3 rounded-full bg-white"
              :class="
                jourActif(jour)
                  ? 'left-[24px]'
                  : 'left-1'
              "
            />
          </span>

          <span
            class="text-base font-medium"
            :class="
              jourActif(jour)
                ? 'text-[#1C2420]'
                : 'text-[#7A847E]'
            "
          >
            {{ jour.label }}
          </span>
        </div>

        <!-- Disponibilités réelles -->

        <div
          v-if="jour.disponibilites.length"
          class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[340px]"
        >
          <div
            v-for="disponibilite in jour.disponibilites"
            :key="disponibilite.id"
            class="flex items-center justify-between gap-4"
          >
            <div
              class="flex items-center gap-3 text-sm"
              :class="
                disponibilite.actif === false
                  ? 'text-[#7A847E]'
                  : 'text-[#1C2420]'
              "
            >
              <span
                class="border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-2"
              >
                {{ formatHeure(disponibilite.heure_debut) }}
              </span>

              <span class="text-[#7A847E]">—</span>

              <span
                class="border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-2"
              >
                {{ formatHeure(disponibilite.heure_fin) }}
              </span>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-sm text-[#7A847E] transition hover:text-[#2D6A4F]"
                @click="ouvrirEdition(disponibilite)"
              >
                Modifier
              </button>

              <button
                type="button"
                class="text-[#A85148] transition hover:text-[#7D332D]"
                :aria-label="`Supprimer la disponibilité du ${jour.label}`"
                @click="supprimerDisponibilite(disponibilite)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            class="self-start text-sm font-medium text-[#2D6A4F] transition hover:text-[#24573F]"
            @click="ouvrirAjout(jour.valeur)"
          >
            Ajouter un horaire
          </button>
        </div>

        <!-- Jour sans disponibilité -->

        <div
          v-else
          class="flex w-full items-center justify-between sm:w-auto sm:min-w-[340px]"
        >
          <span
            class="border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-2 text-sm text-[#7A847E]"
          >
            Indisponible
          </span>

          <button
            type="button"
            class="text-sm font-medium text-[#2D6A4F] transition hover:text-[#24573F]"
            @click="ouvrirAjout(jour.valeur)"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- ==========================================================
       PÉRIODES EXCEPTIONNELLES
  =========================================================== -->
<!--
  <section
    class="flex flex-col gap-6 border border-[#E5E7E2] bg-[#FAFAF8] p-5 sm:p-8"
  >
    <div
      class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2
          class="font-['Instrument_Serif'] text-xl leading-7 text-[#1C2420]"
        >
          Périodes d'indisponibilité exceptionnelles
        </h2>

        <p class="mt-1 text-sm leading-5 text-[#7A847E]">
          Bloquez des dates spécifiques pour vos vacances ou imprévus.
        </p>
      </div>

      <button
        type="button"
        disabled
        class="inline-flex cursor-not-allowed items-center justify-center gap-2 border border-[#E5E7E2] px-4 py-2 text-sm font-medium text-[#9AA19D]"
        title="Fonctionnalité non disponible dans l'API actuelle"
      >
        <Plus class="h-4 w-4" />
        Ajouter une période
      </button>
    </div>

    <div
      class="border border-dashed border-[#E5E7E2] px-5 py-8 text-center"
    >
      <p class="text-sm leading-6 text-[#7A847E]">
        La gestion des périodes d'indisponibilité exceptionnelles
        nécessite encore son endpoint API.
      </p>
    </div>
  </section> -->
</div>

<!-- ==========================================================
     MODALE AJOUT / MODIFICATION
=========================================================== -->

<Teleport to="body">
  <div
    v-if="formulaireOuvert"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1C1A]/40 px-4 py-6"
    @click.self="fermerFormulaire"
  >
    <div
      class="w-full max-w-[520px] border border-[#E5E7E2] bg-[#FAFAF8]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-formulaire-disponibilite"
    >
      <!-- En-tête modal -->

      <div
        class="flex items-start justify-between gap-6 border-b border-[#E5E7E2] px-5 py-5 sm:px-6"
      >
        <div>
          <h2
            id="titre-formulaire-disponibilite"
            class="font-['Instrument_Serif'] text-2xl leading-8 text-[#1C2420]"
          >
            {{
              disponibiliteEnEdition
                ? 'Modifier la disponibilité'
                : 'Ajouter une disponibilité'
            }}
          </h2>

          <p class="mt-1 text-sm leading-5 text-[#7A847E]">
            Définissez le jour et les horaires pendant lesquels vous êtes
            disponible.
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 text-[#7A847E] transition hover:text-[#1C2420]"
          aria-label="Fermer"
          :disabled="formulaireEnvoi"
          @click="fermerFormulaire"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Corps -->

      <div class="px-5 py-6 sm:px-6">
        <div class="flex flex-col gap-5">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-[#1C2420]">
              Jour
            </span>

            <select
              v-model="formulaireDispo.jour_semaine"
              class="w-full border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-3 text-sm text-[#1C2420] outline-none transition focus:border-[#2D6A4F]"
            >
              <option
                v-for="jour in joursSemaine"
                :key="jour.valeur"
                :value="jour.valeur"
              >
                {{ jour.label }}
              </option>
            </select>
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="flex flex-col gap-2">
              <span class="text-sm font-medium text-[#1C2420]">
                Heure de début
              </span>

              <input
                v-model="formulaireDispo.heure_debut"
                type="time"
                class="w-full border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-3 text-sm text-[#1C2420] outline-none transition focus:border-[#2D6A4F]"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-sm font-medium text-[#1C2420]">
                Heure de fin
              </span>

              <input
                v-model="formulaireDispo.heure_fin"
                type="time"
                class="w-full border border-[#E5E7E2] bg-[#F2F3F0] px-3 py-3 text-sm text-[#1C2420] outline-none transition focus:border-[#2D6A4F]"
              />
            </label>
          </div>

          <p
            v-if="formulaireErreur"
            class="border border-[#E7B8B2] bg-[#FFF0EE] p-3 text-sm leading-5 text-[#A85148]"
          >
            {{ formulaireErreur }}
          </p>
        </div>
      </div>

      <!-- Actions -->

      <div
        class="flex flex-col-reverse gap-3 border-t border-[#E5E7E2] px-5 py-5 sm:flex-row sm:justify-end sm:px-6"
      >
        <button
          type="button"
          class="border border-[#E5E7E2] bg-[#FAFAF8] px-6 py-3 text-sm font-medium text-[#1C2420] transition hover:bg-[#F2F3F0] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="formulaireEnvoi"
          @click="fermerFormulaire"
        >
          Annuler
        </button>

        <button
          type="button"
          class="bg-[#2D6A4F] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#24573F] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="formulaireEnvoi"
          @click="soumettreFormulaire"
        >
          {{
            formulaireEnvoi
              ? 'Enregistrement...'
              : disponibiliteEnEdition
                ? 'Enregistrer les modifications'
                : 'Ajouter la disponibilité'
          }}
        </button>
      </div>
    </div>
  </div>
</Teleport>


  </AppLayout>
</template>
