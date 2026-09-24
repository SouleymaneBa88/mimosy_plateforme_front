<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  X
} from 'lucide-vue-next'

import AppLayout from '@/components/layout/AppLayout.vue'
import Loader from '@/components/common/Loader.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import * as adminService from '@/services/adminService'

const route = useRoute()
const router = useRouter()

const demande = ref(null)
const loading = ref(true)
const errorMessage = ref('')

const demandeId = computed(() => route.params.id)

const statutLabels = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée'
}

const statutClasses = {
  EN_ATTENTE: 'border-[#E6E8E3] bg-[#F2F3F0] text-[#1C2420]',
  ACCEPTEE: 'border-[#2D6A4F] bg-[#2D6A4F] text-white',
  REFUSEE: 'border-[#F4C7C2] bg-[#FFF0EE] text-[#A85148]',
  TERMINEE: 'border-[#DCEBE4] bg-[#EAF8F2] text-[#16805B]',
  ANNULEE: 'border-[#F4C7C2] bg-[#FFF0EE] text-[#A85148]'
}

const statutLabel = computed(() => {
  return statutLabels[demande.value?.statut] || demande.value?.statut || '—'
})

const statutClasse = computed(() => {
  return statutClasses[demande.value?.statut] || statutClasses.EN_ATTENTE
})

function valeur(...valeurs) {
  return valeurs.find(
    (item) => item !== undefined && item !== null && item !== ''
  ) || '—'
}

function nomUtilisateur(utilisateur) {
  if (!utilisateur) return '—'

  if (typeof utilisateur === 'string') {
    return utilisateur
  }

  const nomComplet = [
    utilisateur.first_name,
    utilisateur.last_name
  ]
    .filter(Boolean)
    .join(' ')

  return valeur(
    nomComplet,
    utilisateur.nom_complet,
    utilisateur.full_name,
    utilisateur.username,
    utilisateur.email
  )
}

function initiales(nom) {
  if (!nom || nom === '—') return '—'

  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join('')
}

function formaterDate(date) {
  if (!date) return '—'

  const dateObj = new Date(date)

  if (Number.isNaN(dateObj.getTime())) {
    return date
  }

  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formaterDateHeure(date) {
  if (!date) return '—'

  const dateObj = new Date(date)

  if (Number.isNaN(dateObj.getTime())) {
    return date
  }

  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formaterMontant(montant) {
  if (
    montant === undefined ||
    montant === null ||
    montant === ''
  ) {
    return '—'
  }

  const nombre = Number(montant)

  if (Number.isNaN(nombre)) {
    return montant
  }

  return `${nombre.toLocaleString('fr-FR')} FCFA`
}

const client = computed(() => {
  return demande.value?.client || null
})

const prestataire = computed(() => {
  return demande.value?.prestataire || null
})

const clientNom = computed(() => {
  return valeur(
    demande.value?.client_nom,
    nomUtilisateur(client.value)
  )
})

const prestataireNom = computed(() => {
  return valeur(
    demande.value?.prestataire_nom,
    nomUtilisateur(prestataire.value)
  )
})

const serviceNom = computed(() => {
  return valeur(
    demande.value?.service_nom,
    demande.value?.service?.nom,
    demande.value?.service?.libelle
  )
})

const categorieNom = computed(() => {
  return valeur(
    demande.value?.categorie_nom,
    demande.value?.categorie?.nom,
    demande.value?.service?.categorie_nom,
    demande.value?.service?.categorie?.nom
  )
})

const description = computed(() => {
  return valeur(
    demande.value?.description,
    demande.value?.description_detaillee,
    demande.value?.details
  )
})

const emailClient = computed(() => {
  return valeur(
    demande.value?.client_email,
    client.value?.email
  )
})

const telephoneClient = computed(() => {
  return valeur(
    demande.value?.client_telephone,
    client.value?.telephone,
    client.value?.phone
  )
})

const ville = computed(() => {
  return valeur(
    demande.value?.ville,
    demande.value?.localisation?.ville,
    demande.value?.localisation?.adresse?.ville
  )
})

const quartier = computed(() => {
  return valeur(
    demande.value?.quartier,
    demande.value?.localisation?.quartier,
    demande.value?.localisation?.adresse?.quartier
  )
})

const adresse = computed(() => {
  return valeur(
    demande.value?.adresse,
    demande.value?.adresse_precise,
    demande.value?.localisation?.adresse,
    demande.value?.localisation?.adresse_complete
  )
})

const latitude = computed(() => {
  return valeur(
    demande.value?.latitude,
    demande.value?.lat,
    demande.value?.localisation?.latitude,
    demande.value?.localisation?.lat
  )
})

const longitude = computed(() => {
  return valeur(
    demande.value?.longitude,
    demande.value?.lon,
    demande.value?.localisation?.longitude,
    demande.value?.localisation?.lon
  )
})

const budget = computed(() => {
  return formaterMontant(
    demande.value?.budget
  )
})

const dateCreation = computed(() => {
  return formaterDateHeure(
    demande.value?.date_creation ||
    demande.value?.created_at
  )
})

const dateSouhaitee = computed(() => {
  return valeur(
    demande.value?.date_souhaitee,
    demande.value?.date_prestation
  )
})

const heureSouhaitee = computed(() => {
  return valeur(
    demande.value?.heure_souhaitee,
    demande.value?.heure_prestation
  )
})

const prestataireSpecialite = computed(() => {
  return valeur(
    demande.value?.prestataire_specialite,
    prestataire.value?.specialite,
    prestataire.value?.metier,
    prestataire.value?.profession,
    prestataire.value?.competence_principale
  )
})

const prestataireNote = computed(() => {
  return valeur(
    demande.value?.prestataire_note,
    prestataire.value?.note_moyenne,
    prestataire.value?.moyenne
  )
})

const prestataireAvis = computed(() => {
  return valeur(
    demande.value?.prestataire_nombre_avis,
    prestataire.value?.nombre_avis,
    prestataire.value?.avis_count
  )
})

const timeline = computed(() => {
  const elements = []

  if (demande.value?.date_creation || demande.value?.created_at) {
    elements.push({
      titre: 'Demande créée',
      description: 'La demande a été enregistrée sur la plateforme.',
      date: formaterDateHeure(
        demande.value.date_creation ||
        demande.value.created_at
      ),
      actif: true
    })
  }

  if (prestataire.value || demande.value?.prestataire_nom) {
    elements.push({
      titre: 'Prestataire assigné',
      description: `${prestataireNom.value} est associé à cette demande.`,
      date: demande.value?.date_acceptation
        ? formaterDateHeure(demande.value.date_acceptation)
        : null,
      actif: true
    })
  }

  if (demande.value?.statut) {
    elements.push({
      titre: statutLabel.value,
      description: `Statut actuel de la demande : ${statutLabel.value}.`,
      date: demande.value?.date_modification
        ? formaterDateHeure(demande.value.date_modification)
        : null,
      actif: true
    })
  }

  return elements
})

async function chargerDemande() {
  loading.value = true
  errorMessage.value = ''

  try {
    /**
     * On utilise le service déjà prévu pour l'administration.
     *
     * Le nom de méthode est vérifié dynamiquement pour éviter
     * de casser la page si le service utilise une autre convention.
     */
    if (typeof adminService.getDemandeAdmin === 'function') {
      demande.value = await adminService.getDemandeAdmin(demandeId.value)
    } else if (typeof adminService.getDemandeDetail === 'function') {
      demande.value = await adminService.getDemandeDetail(demandeId.value)
    } else if (typeof adminService.getDemande === 'function') {
      demande.value = await adminService.getDemande(demandeId.value)
    } else {
      throw new Error(
        'La méthode de récupération du détail de la demande est absente de adminService.'
      )
    }
  } catch (error) {
    errorMessage.value =
      error?.message ||
      'Impossible de charger les informations de cette demande.'
  } finally {
    loading.value = false
  }
}

function retournerAuxDemandes() {
  router.push({ name: 'admin-demandes' })
}

function modifierDemande() {
  router.push({
    name: 'admin-demande-edit',
    params: {
      id: demandeId.value
    }
  })
}

function voirProfilPrestataire() {
  if (!prestataire.value) return

  const id =
    prestataire.value.id ||
    demande.value?.prestataire_id ||
    demande.value?.prestataire?.id

  if (!id) return

  router.push({
    name: 'admin-prestataire-detail',
    params: { id }
  })
}

function contacterClient() {
  if (!emailClient.value || emailClient.value === '—') return

  window.location.href = `mailto:${emailClient.value}`
}

function contacterPrestataire() {
  const email =
    prestataire.value?.email ||
    demande.value?.prestataire_email

  if (!email) return

  window.location.href = `mailto:${email}`
}

onMounted(chargerDemande)
</script>

<template>
  <AppLayout role="admin" background="#F2F3F0">
    <div class="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-5 py-6 lg:px-10 lg:py-10">

      <!-- Retour -->
      <button
        type="button"
        class="flex w-fit items-center gap-2 text-left text-[12px] font-bold uppercase tracking-[1.2px] text-[#1C2420]/60 transition hover:text-[#2D6A4F]"
        @click="retournerAuxDemandes"
      >
        <ArrowLeft :size="16" :stroke-width="1.8" />
        <span>Retour aux demandes</span>
      </button>

      <!-- Chargement -->
      <Loader v-if="loading" />

      <!-- Erreur -->
      <ErrorState
        v-else-if="errorMessage"
        :message="errorMessage"
        @retry="chargerDemande"
      />

      <template v-else-if="demande">

        <!-- En-tête -->
        <header class="flex flex-col gap-6 border-b border-[#E6E8E3] pb-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 class="font-serif text-4xl leading-none text-[#1C2420] lg:text-5xl">
              #{{ demande.id }}
            </h1>

            <p class="mt-3 text-base text-[#7A847E]">
              Créée le {{ dateCreation }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span
              class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold"
              :class="statutClasse"
            >
              {{ statutLabel }}
            </span>

            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24563F]"
              @click="modifierDemande"
            >
              <Edit3 :size="17" :stroke-width="1.8" />
              Éditer la demande
            </button>
          </div>
        </header>

        <!-- Contenu principal -->
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">

          <!-- COLONNE PRINCIPALE -->
          <main class="flex min-w-0 flex-col gap-6">

            <!-- Informations client -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-2xl text-[#1C2420]">
                Informations du Client
              </h2>

              <div class="mt-7 grid gap-6 sm:grid-cols-2">

                <div class="flex items-center gap-3 sm:col-span-2">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6E8E3] text-sm font-bold text-[#2D6A4F]">
                    {{ initiales(clientNom) }}
                  </div>

                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                      Nom complet
                    </p>
                    <p class="mt-1 truncate text-sm font-semibold text-[#1C2420]">
                      {{ clientNom }}
                    </p>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Email
                  </p>

                  <div class="mt-2 flex items-center gap-2 text-sm text-[#1C2420]">
                    <Mail :size="16" :stroke-width="1.7" class="text-[#7A847E]" />
                    <span class="break-all">{{ emailClient }}</span>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Téléphone
                  </p>

                  <div class="mt-2 flex items-center gap-2 text-sm text-[#1C2420]">
                    <Phone :size="16" :stroke-width="1.7" class="text-[#7A847E]" />
                    <span>{{ telephoneClient }}</span>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Ville
                  </p>

                  <div class="mt-2 flex items-center gap-2 text-sm text-[#1C2420]">
                    <MapPin :size="16" :stroke-width="1.7" class="text-[#7A847E]" />
                    <span>{{ ville }}</span>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Quartier
                  </p>

                  <div class="mt-2 flex items-center gap-2 text-sm text-[#1C2420]">
                    <MapPin :size="16" :stroke-width="1.7" class="text-[#7A847E]" />
                    <span>{{ quartier }}</span>
                  </div>
                </div>

              </div>
            </section>

            <!-- Détails prestation -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-2xl text-[#1C2420]">
                Détails de la Prestation
              </h2>

              <div class="mt-7 grid gap-6 sm:grid-cols-2">

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Service
                  </p>
                  <p class="mt-2 text-sm font-semibold text-[#1C2420]">
                    {{ serviceNom }}
                  </p>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Catégorie
                  </p>
                  <p class="mt-2 text-sm font-semibold text-[#1C2420]">
                    {{ categorieNom }}
                  </p>
                </div>

                <div class="sm:col-span-2">
                  <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    Description complète
                  </p>

                  <p class="mt-2 whitespace-pre-line text-sm leading-7 text-[#33413A]">
                    {{ description }}
                  </p>
                </div>

              </div>

              <!-- Date / heure -->
              <div
                v-if="dateSouhaitee !== '—' || heureSouhaitee !== '—'"
                class="mt-7 grid gap-4 rounded-xl border border-[#E6E8E3] bg-[#F2F3F0] p-5 sm:grid-cols-2"
              >
                <div v-if="dateSouhaitee !== '—'">
                  <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    <CalendarDays :size="15" />
                    Date souhaitée
                  </div>

                  <p class="mt-2 text-sm font-semibold text-[#1C2420]">
                    {{ dateSouhaitee }}
                  </p>
                </div>

                <div v-if="heureSouhaitee !== '—'">
                  <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                    <Clock3 :size="15" />
                    Heure souhaitée
                  </div>

                  <p class="mt-2 text-sm font-semibold text-[#1C2420]">
                    {{ heureSouhaitee }}
                  </p>
                </div>
              </div>

              <!-- Budget -->
              <div class="mt-6">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#7A847E]">
                  Budget
                </p>

                <p class="mt-2 text-lg font-semibold text-[#2D6A4F]">
                  {{ budget }}
                </p>
              </div>
            </section>

            <!-- Localisation -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-2xl text-[#1C2420]">
                Localisation
              </h2>

              <div class="mt-6 flex items-start gap-3">
                <MapPin
                  :size="18"
                  :stroke-width="1.8"
                  class="mt-0.5 shrink-0 text-[#2D6A4F]"
                />

                <div>
                  <p class="text-sm font-semibold text-[#1C2420]">
                    Adresse précise
                  </p>

                  <p class="mt-1 text-sm leading-6 text-[#7A847E]">
                    {{ adresse }}
                  </p>
                </div>
              </div>

              <!-- Carte réelle uniquement si les coordonnées existent -->
              <div
                v-if="latitude !== '—' && longitude !== '—'"
                class="mt-6 flex h-64 items-center justify-center rounded-xl border border-[#E6E8E3] bg-[#F2F3F0]"
              >
                <div class="text-center">
                  <MapPin
                    :size="28"
                    :stroke-width="1.6"
                    class="mx-auto text-[#2D6A4F]"
                  />

                  <p class="mt-3 text-sm font-semibold text-[#1C2420]">
                    Localisation disponible
                  </p>

                  <p class="mt-1 text-xs text-[#7A847E]">
                    {{ latitude }}, {{ longitude }}
                  </p>
                </div>
              </div>

              <div
                v-else
                class="mt-6 flex h-48 items-center justify-center rounded-xl border border-[#E6E8E3] bg-[#F2F3F0]"
              >
                <div class="text-center px-6">
                  <MapPin
                    :size="24"
                    :stroke-width="1.6"
                    class="mx-auto text-[#7A847E]"
                  />

                  <p class="mt-3 text-sm font-semibold text-[#1C2420]">
                    Coordonnées GPS indisponibles
                  </p>

                  <p class="mt-1 text-xs text-[#7A847E]">
                    La demande contient uniquement l'adresse renseignée.
                  </p>
                </div>
              </div>
            </section>

          </main>

          <!-- COLONNE DROITE -->
          <aside class="flex min-w-0 flex-col gap-6">

            <!-- Prestataire -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-xl text-[#1C2420]">
                Prestataire assigné
              </h2>

              <div
                v-if="prestataire"
                class="mt-6"
              >
                <div class="flex items-center gap-4">
                  <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E6E8E3] text-lg font-bold text-[#2D6A4F]">
                    {{ initiales(prestataireNom) }}
                  </div>

                  <div class="min-w-0">
                    <p class="truncate text-base font-semibold text-[#1C2420]">
                      {{ prestataireNom }}
                    </p>

                    <p class="mt-1 text-sm text-[#7A847E]">
                      {{ prestataireSpecialite }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="prestataireNote !== '—' || prestataireAvis !== '—'"
                  class="mt-5 border-t border-[#E6E8E3] pt-5"
                >
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-[#7A847E]">
                      Évaluation
                    </span>

                    <span class="font-semibold text-[#1C2420]">
                      {{ prestataireNote }}
                      <span v-if="prestataireAvis !== '—'" class="font-normal text-[#7A847E]">
                        · {{ prestataireAvis }} avis
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  class="mt-6 w-full rounded-xl border border-[#E6E8E3] px-4 py-3 text-sm font-semibold text-[#1C2420] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  @click="voirProfilPrestataire"
                >
                  Voir le profil complet
                </button>
              </div>

              <div
                v-else
                class="mt-6 border border-dashed border-[#E6E8E3] px-5 py-8 text-center"
              >
                <User
                  :size="24"
                  :stroke-width="1.6"
                  class="mx-auto text-[#7A847E]"
                />

                <p class="mt-3 text-sm font-semibold text-[#1C2420]">
                  Aucun prestataire assigné
                </p>

                <p class="mt-1 text-xs leading-5 text-[#7A847E]">
                  Aucun prestataire n'est actuellement associé à cette demande.
                </p>
              </div>
            </section>

            <!-- Timeline -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-xl text-[#1C2420]">
                Suivi
              </h2>

              <div
                v-if="timeline.length"
                class="mt-6"
              >
                <div
                  v-for="(evenement, index) in timeline"
                  :key="`${evenement.titre}-${index}`"
                  class="relative flex gap-4 pb-7 last:pb-0"
                >
                  <!-- Ligne -->
                  <div
                    v-if="index < timeline.length - 1"
                    class="absolute left-[9px] top-5 h-full w-px bg-[#E6E8E3]"
                  />

                  <div class="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2D6A4F]">
                    <div class="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>

                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-[#1C2420]">
                      {{ evenement.titre }}
                    </p>

                    <p class="mt-1 text-xs leading-5 text-[#7A847E]">
                      {{ evenement.description }}
                    </p>

                    <p
                      v-if="evenement.date"
                      class="mt-2 text-[11px] font-medium text-[#A0A8A3]"
                    >
                      {{ evenement.date }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="mt-6 text-sm text-[#7A847E]"
              >
                Aucun historique disponible.
              </div>
            </section>

            <!-- Actions administratives -->
            <section class="rounded-2xl border border-[#E6E8E3] bg-[#FAFAF8] p-6 lg:p-8">
              <h2 class="font-serif text-xl text-[#1C2420]">
                Actions Administratives
              </h2>

              <div class="mt-6 flex flex-col gap-3">

                <button
                  type="button"
                  class="flex items-center gap-3 rounded-xl border border-[#E6E8E3] px-4 py-3 text-left text-sm font-semibold text-[#1C2420] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  @click="contacterClient"
                >
                  <Mail :size="17" :stroke-width="1.8" />
                  Contacter le client
                </button>

                <button
                  v-if="prestataire"
                  type="button"
                  class="flex items-center gap-3 rounded-xl border border-[#E6E8E3] px-4 py-3 text-left text-sm font-semibold text-[#1C2420] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  @click="contacterPrestataire"
                >
                  <MessageCircle :size="17" :stroke-width="1.8" />
                  Contacter le prestataire
                </button>

                <button
                  v-if="demande.statut !== 'TERMINEE' && demande.statut !== 'ANNULEE'"
                  type="button"
                  class="flex items-center gap-3 rounded-xl border border-[#2D6A4F] px-4 py-3 text-left text-sm font-semibold text-[#2D6A4F] transition hover:bg-[#EAF8F2]"
                >
                  <Check :size="17" :stroke-width="1.8" />
                  Marquer comme résolue
                </button>

                <button
                  v-if="demande.statut !== 'ANNULEE' && demande.statut !== 'TERMINEE'"
                  type="button"
                  class="flex items-center gap-3 rounded-xl border border-[#F4C7C2] px-4 py-3 text-left text-sm font-semibold text-[#A85148] transition hover:bg-[#FFF0EE]"
                >
                  <X :size="17" :stroke-width="1.8" />
                  Annuler la demande
                </button>

              </div>
            </section>

          </aside>
        </div>
      </template>
    </div>
  </AppLayout>
</template>