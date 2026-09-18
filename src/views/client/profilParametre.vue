<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  Bell,
  Globe2,
  MapPin,
  PenLine,
  ShieldAlert,
} from 'lucide-vue-next'

import PhotoProfil from '@/components/client/PhotoProfil.vue'
import AppLayout from '@/components/layout/AppLayout.vue'

import { useClientProfilStore } from '@/stores/clientProfil'
import { apiFetch } from '@/services/api'
import { API_ENDPOINTS } from '@/config/api'

const clientProfilStore = useClientProfilStore()

/*
|--------------------------------------------------------------------------
| PROFIL
|--------------------------------------------------------------------------
*/

// Référence réactive directement issue du store (pas de copie locale :
// on édite l'objet du store, puis on restaure une sauvegarde en cas d'annulation).
const profil = clientProfilStore.profil

// Snapshot du profil pris juste avant le passage en mode édition,
// utilisé pour restaurer les valeurs si l'utilisateur clique sur "Annuler".
let profilAvantEdition = null

const isEditingProfil = ref(false)
const messageErreurProfil = ref('')

// Recalcule le champ d'affichage "nomComplet" à partir de firstName/lastName.
// Utile après un chargement ou une mise à jour du profil, quand la source
// de vérité reste les deux champs séparés côté API.
function synchroniserNomComplet() {
  profil.nomComplet = `${profil.firstName} ${profil.lastName}`.trim()
}

// Inverse de synchroniserNomComplet : on répartit le champ unique édité
// par l'utilisateur (nomComplet) en firstName/lastName pour l'envoi à l'API.
// Le premier mot devient le prénom, tout le reste devient le nom.
function separerNomComplet(nomComplet) {
  const morceaux = nomComplet.trim().split(/\s+/)

  const firstName = morceaux.shift() || ''
  const lastName = morceaux.join(' ')

  return {
    firstName,
    lastName,
  }
}

// Charge le profil depuis le store (API) et synchronise l'affichage.
// Appelée au montage du composant.
async function chargerProfil() {
  try {
    await clientProfilStore.chargerProfil()

    synchroniserNomComplet()

    messageErreurProfil.value = ''
  } catch (error) {
    console.error('Erreur chargement profil :', error)

    messageErreurProfil.value =
      'Impossible de charger vos données. Vérifiez que vous êtes connecté.'
  }
}

// Sauvegarde l'état actuel du profil avant édition, puis bascule le formulaire
// en mode modifiable (champs non-readonly).
function activerEditionProfil() {
  profilAvantEdition = {
    ...profil,
  }

  isEditingProfil.value = true
}

// Restaure le profil à son état précédent (si une sauvegarde existe)
// et referme le mode édition sans rien envoyer à l'API.
function annulerEditionProfil() {
  if (profilAvantEdition) {
    Object.assign(profil, profilAvantEdition)
  }

  isEditingProfil.value = false
}

// Sépare le nom complet édité, envoie la mise à jour à l'API via le store,
// puis re-synchronise l'affichage et quitte le mode édition.
async function enregistrerProfil() {
  const noms = separerNomComplet(profil.nomComplet)

  try {
    await clientProfilStore.mettreAJourProfil({
      firstName: noms.firstName,
      lastName: noms.lastName,
      email: profil.email,
      telephone: profil.telephone,
    })

    synchroniserNomComplet()

    messageErreurProfil.value = ''
    isEditingProfil.value = false
  } catch (error) {
    console.error('Erreur mise à jour profil :', error)

    messageErreurProfil.value =
      error.message || 'Impossible de mettre à jour le profil.'
  }
}

// Envoie le nouveau fichier photo au store, déclenché par l'événement
// "selected" du composant PhotoProfil.
async function envoyerPhotoProfil(fichier) {
  try {
    await clientProfilStore.mettreAJourPhoto(fichier)

    messageErreurProfil.value = ''
  } catch (error) {
    console.error('Erreur photo profil :', error)

    messageErreurProfil.value =
      error.message || "Impossible d'envoyer la photo de profil."
  }
}

/*
|--------------------------------------------------------------------------
| LOCALISATION RÉELLE
|--------------------------------------------------------------------------
*/

const localisation = ref(null)
const localisationLoading = ref(false)
const localisationErreur = ref('')

// Récupère la localisation du client depuis l'API. L'endpoint étant un
// ModelViewSet, il peut renvoyer soit une liste (on prend le premier élément),
// soit un objet unique selon la configuration côté backend.
async function chargerLocalisation() {
  localisationLoading.value = true
  localisationErreur.value = ''

  try {
    const data = await apiFetch(API_ENDPOINTS.location)

    /*
     * ModelViewSet -> GET /api/location/
     * retourne généralement une liste.
     */
    if (Array.isArray(data)) {
      localisation.value = data[0] || null
    } else {
      localisation.value = data
    }

    console.log(
      'Localisation réelle du client :',
      localisation.value
    )
  } catch (error) {
    console.error(
      'Erreur lors du chargement de la localisation :',
      error
    )

    localisationErreur.value =
      'Impossible de charger votre localisation.'
  } finally {
    localisationLoading.value = false
  }
}

// Formate une date ISO en date/heure lisible en français.
// Renvoie une chaîne vide si la date est absente ou invalide,
// pour éviter d'afficher "Invalid Date" dans le template.
function formaterDateLocalisation(date) {
  if (!date) {
    return ''
  }

  const dateFormatee = new Date(date)

  if (Number.isNaN(dateFormatee.getTime())) {
    return ''
  }

  return dateFormatee.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS RÉELLES
|--------------------------------------------------------------------------
*/

const notifications = ref([])
const notificationsLoading = ref(false)
const notificationsErreur = ref('')

// Charge les notifications du client. Gère les deux formats de réponse
// possibles côté API : liste brute, ou objet paginé avec "results".
async function chargerNotifications() {
  notificationsLoading.value = true
  notificationsErreur.value = ''

  try {
    const data = await apiFetch(API_ENDPOINTS.notifications)

    if (Array.isArray(data)) {
      notifications.value = data
    } else if (Array.isArray(data?.results)) {
      notifications.value = data.results
    } else {
      notifications.value = []
    }

    console.log(
      'Notifications réelles :',
      notifications.value
    )
  } catch (error) {
    console.error(
      'Erreur lors du chargement des notifications :',
      error
    )

    notificationsErreur.value =
      'Impossible de charger vos notifications.'
  } finally {
    notificationsLoading.value = false
  }
}

/*
|--------------------------------------------------------------------------
| NORMALISATION AFFICHAGE NOTIFICATION
|--------------------------------------------------------------------------
|
| On ne crée aucune donnée.
| On récupère uniquement les valeurs présentes dans l'API.
|--------------------------------------------------------------------------
*/

// Les fonctions ci-dessous existent car le backend peut renvoyer des noms
// de champs différents selon l'origine de la notification (type, titre,
// état de lecture...). On centralise ici la logique de "premier champ
// disponible" pour ne pas la répéter dans le template.

function obtenirTypeNotification(notification) {
  return (
    notification.type ||
    notification.type_notification ||
    'autre'
  )
}

function obtenirTitreNotification(notification) {
  return (
    notification.titre ||
    notification.title ||
    notification.message ||
    'Notification'
  )
}

function obtenirDescriptionNotification(notification) {
  return (
    notification.description ||
    notification.contenu ||
    notification.message ||
    ''
  )
}

// L'état "lue" peut être stocké sous trois noms de clé différents selon
// la version de l'API. On teste chacune dans l'ordre et on retombe sur
// "non lue" par défaut si aucune n'est présente.
function obtenirEtatNotification(notification) {
  if (typeof notification.lue === 'boolean') {
    return notification.lue
  }

  if (typeof notification.is_read === 'boolean') {
    return notification.is_read
  }

  if (typeof notification.read === 'boolean') {
    return notification.read
  }

  return false
}

function obtenirDateNotification(notification) {
  return (
    notification.created_at ||
    notification.date_creation ||
    notification.date ||
    null
  )
}

function formaterDateNotification(date) {
  if (!date) {
    return ''
  }

  const dateFormatee = new Date(date)

  if (Number.isNaN(dateFormatee.getTime())) {
    return ''
  }

  return dateFormatee.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Config d'affichage (libellé + couleur) par type de notification,
// utilisée pour grouper et styliser le popup de notifications.
const configTypeNotification = {
  demande: {
    label: 'Demandes',
    color: '#3267B1',
  },

  message: {
    label: 'Messages',
    color: '#2F6250',
  },

  paiement: {
    label: 'Paiements',
    color: '#C08B3E',
  },

  autre: {
    label: 'Autres',
    color: '#64748B',
  },
}

const isNotificationsPopupOpen = ref(false)

// Regroupe les notifications par type pour l'affichage en sections
// dans le popup (une section par type, avec son libellé et sa couleur).
const notificationsParType = computed(() => {
  const groupes = {}

  for (const notification of notifications.value) {
    const type = obtenirTypeNotification(notification)

    if (!groupes[type]) {
      groupes[type] = []
    }

    groupes[type].push(notification)
  }

  return groupes
})

// Compte les notifications non lues, affiché en badge sur la cloche.
const nombreNotificationsNonLues = computed(() => {
  return notifications.value.filter(
    (notification) =>
      !obtenirEtatNotification(notification)
  ).length
})

function toggleNotificationsPopup() {
  isNotificationsPopupOpen.value =
    !isNotificationsPopupOpen.value
}

function fermerNotificationsPopup() {
  isNotificationsPopupOpen.value = false
}

// Marque une notification comme lue côté API (PATCH), puis met à jour
// l'état local en testant les trois clés possibles (lue / is_read / read)
// pour rester cohérent avec obtenirEtatNotification.
async function marquerNotificationLue(id) {
  if (!id) {
    return
  }

  try {
    await apiFetch(
      API_ENDPOINTS.readNotification(id),
      {
        method: 'PATCH',
      }
    )

    const notification = notifications.value.find(
      (item) => item.id === id
    )

    if (notification) {
      if ('lue' in notification) {
        notification.lue = true
      }

      if ('is_read' in notification) {
        notification.is_read = true
      }

      if ('read' in notification) {
        notification.read = true
      }
    }
  } catch (error) {
    console.error(
      'Erreur lors du marquage de la notification :',
      error
    )
  }
}

/*
|--------------------------------------------------------------------------
| LANGUE
|--------------------------------------------------------------------------
|
| Aucun faux état enregistré dans le backend.
| On affiche simplement la langue de l'application.
|--------------------------------------------------------------------------
*/

const langueActuelle = ref('Français')

/*
|--------------------------------------------------------------------------
| CLIC EXTÉRIEUR
|--------------------------------------------------------------------------
*/

// Ferme le popup de notifications si l'utilisateur clique en dehors
// de celui-ci et en dehors du bouton cloche qui l'ouvre.
function gererClicExterieur(event) {
  const popup = document.querySelector(
    '[data-notifications-popup]'
  )

  const boutonCloche = event.target.closest(
    '[data-notifications-trigger]'
  )

  if (
    popup &&
    !popup.contains(event.target) &&
    !boutonCloche
  ) {
    fermerNotificationsPopup()
  }
}

/*
|--------------------------------------------------------------------------
| INITIALISATION
|--------------------------------------------------------------------------
*/

onMounted(() => {
  chargerProfil()
  chargerLocalisation()
  chargerNotifications()

  document.addEventListener(
    'click',
    gererClicExterieur
  )
})

onUnmounted(() => {
  document.removeEventListener(
    'click',
    gererClicExterieur
  )
})
</script>

<template>
  <AppLayout>
    <div
      class="mx-auto flex w-full max-w-7xl flex-col gap-7 text-[#051F20]"
    >
      <!-- EN-TÊTE -->

      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p
            class="text-xs font-bold uppercase tracking-[0.08em] text-[#2F6250]"
          >
            Espace client
          </p>

          <h1
            class="mt-1 text-[26px] font-extrabold leading-tight text-[#051F20] sm:text-[32px]"
          >
            Profil & paramètres
          </h1>

          <p
            class="mt-1 text-sm text-[#64748B] sm:text-[15px]"
          >
            Gardez vos informations à jour pour faciliter
            vos demandes de service.
          </p>

          <p
            v-if="clientProfilStore.isLoading"
            class="mt-2 text-sm font-semibold text-[#2F6250]"
          >
            Synchronisation du profil...
          </p>

          <p
            v-if="messageErreurProfil"
            class="mt-2 text-sm font-semibold text-[#C53B35]"
          >
            {{ messageErreurProfil }}
          </p>
        </div>

        <!-- NOTIFICATIONS -->

        <div class="flex items-center gap-3">
          <div class="relative">
            <button
              type="button"
              data-notifications-trigger
              class="relative flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-[#FFF3ED] hover:text-[#2F6250]"
              aria-label="Notifications"
              @click="toggleNotificationsPopup"
            >
              <Bell class="h-5 w-5" />

              <span
                v-if="nombreNotificationsNonLues > 0"
                class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C53B35] px-1 text-[10px] font-bold text-white"
              >
                {{ nombreNotificationsNonLues }}
              </span>
            </button>

            <!-- Popup de notifications, positionné sous la cloche,
                 fermé automatiquement par gererClicExterieur -->
            <Transition name="fade-modal">
              <div
                v-if="isNotificationsPopupOpen"
                data-notifications-popup
                class="absolute right-0 top-14 z-20 w-[calc(100vw-104px)] max-w-96 overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-lg"
              >
                <div
                  class="border-b border-[#F1F5F9] px-5 py-4"
                >
                  <p
                    class="font-bold text-[#051F20]"
                  >
                    Notifications
                  </p>
                </div>

                <div class="max-h-96 overflow-y-auto">
                  <!-- CHARGEMENT -->

                  <div
                    v-if="notificationsLoading"
                    class="px-5 py-8 text-center text-sm text-[#64748B]"
                  >
                    Chargement des notifications...
                  </div>

                  <!-- ERREUR -->

                  <div
                    v-else-if="notificationsErreur"
                    class="px-5 py-8 text-center text-sm text-[#C53B35]"
                  >
                    {{ notificationsErreur }}
                  </div>

                  <!-- NOTIFICATIONS GROUPÉES PAR TYPE -->

                  <template
                    v-else-if="notifications.length > 0"
                  >
                    <div
                      v-for="(items, type) in notificationsParType"
                      :key="type"
                      class="border-b border-[#F1F5F9] last:border-b-0"
                    >
                      <p
                        class="px-5 pt-3 text-xs font-bold uppercase tracking-[0.06em]"
                        :style="{
                          color:
                            configTypeNotification[type]
                              ?.color || '#64748B',
                        }"
                      >
                        {{
                          configTypeNotification[type]
                            ?.label || type
                        }}
                      </p>

                      <!-- Chaque notification : point vert si non lue,
                           clic = marque comme lue -->
                      <button
                        v-for="notification in items"
                        :key="notification.id"
                        type="button"
                        class="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-[#FFFDF9]"
                        :class="{
                          'bg-[#FFF3ED]/50':
                            !obtenirEtatNotification(
                              notification
                            ),
                        }"
                        @click="
                          marquerNotificationLue(
                            notification.id
                          )
                        "
                      >
                        <span
                          class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          :class="
                            obtenirEtatNotification(
                              notification
                            )
                              ? 'bg-transparent'
                              : 'bg-[#2F6250]'
                          "
                        ></span>

                        <span
                          class="min-w-0 flex-1"
                        >
                          <span
                            class="block truncate text-sm font-semibold text-[#051F20]"
                          >
                            {{
                              obtenirTitreNotification(
                                notification
                              )
                            }}
                          </span>

                          <span
                            v-if="
                              obtenirDescriptionNotification(
                                notification
                              )
                            "
                            class="block truncate text-xs text-[#64748B]"
                          >
                            {{
                              obtenirDescriptionNotification(
                                notification
                              )
                            }}
                          </span>

                          <span
                            v-if="
                              obtenirDateNotification(
                                notification
                              )
                            "
                            class="mt-0.5 block text-[11px] text-[#94A3B8]"
                          >
                            {{
                              formaterDateNotification(
                                obtenirDateNotification(
                                  notification
                                )
                              )
                            }}
                          </span>
                        </span>
                      </button>
                    </div>
                  </template>

                  <!-- AUCUNE NOTIFICATION -->

                  <p
                    v-else
                    class="px-5 py-8 text-center text-sm text-[#64748B]"
                  >
                    Aucune notification pour le moment.
                  </p>
                </div>
              </div>
            </Transition>
          </div>

          <PhotoProfil
            :photo="profil.photo"
            :name="profil.nomComplet"
            size="small"
            :editable="false"
          />
        </div>
      </header>

      <!-- CONTENU PRINCIPAL -->

      <section
        class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <!-- PROFIL -->

        <div
          class="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <div
            class="flex flex-col gap-5 border-b border-[#F1F5F9] pb-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <PhotoProfil
              v-model:photo="profil.photo"
              :name="profil.nomComplet"
              :email="profil.email"
              @selected="envoyerPhotoProfil"
            />

            <!-- Bouton "Modifier" masqué une fois en mode édition
                 (remplacé par Annuler / Enregistrer plus bas) -->
            <button
              v-if="!isEditingProfil"
              type="button"
              :disabled="clientProfilStore.isLoading"
              class="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#2F6250] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#244B3D]"
              @click="activerEditionProfil"
            >
              <PenLine class="h-4 w-4" />
              Modifier
            </button>
          </div>

          <!-- Formulaire profil : champs en lecture seule hors édition,
               style grisé pour le signaler visuellement -->
          <form
            class="mt-6 grid gap-4 sm:grid-cols-2"
            @submit.prevent="enregistrerProfil"
          >
            <label
              class="flex flex-col gap-1.5 sm:col-span-2"
            >
              <span
                class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
              >
                Nom complet
              </span>

              <input
                v-model="profil.nomComplet"
                type="text"
                :readonly="!isEditingProfil"
                class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none transition"
                :class="
                  isEditingProfil
                    ? 'bg-white focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10'
                    : 'bg-[#F8FAFC]'
                "
              />
            </label>

            <label
              class="flex flex-col gap-1.5 sm:col-span-2"
            >
              <span
                class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
              >
                Email
              </span>

              <input
                v-model="profil.email"
                type="email"
                :readonly="!isEditingProfil"
                class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none transition"
                :class="
                  isEditingProfil
                    ? 'bg-white focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10'
                    : 'bg-[#F8FAFC]'
                "
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span
                class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
              >
                Indicatif
              </span>

              <input
                v-model="profil.indicatif"
                type="text"
                :readonly="!isEditingProfil"
                class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none transition"
                :class="
                  isEditingProfil
                    ? 'bg-white focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10'
                    : 'bg-[#F8FAFC]'
                "
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span
                class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
              >
                Téléphone
              </span>

              <input
                v-model="profil.telephone"
                type="tel"
                :readonly="!isEditingProfil"
                class="h-12 rounded-[10px] border border-[#E2E8F0] px-3 text-sm font-medium text-[#051F20] outline-none transition"
                :class="
                  isEditingProfil
                    ? 'bg-white focus:border-[#2F6250] focus:ring-4 focus:ring-[#2F6250]/10'
                    : 'bg-[#F8FAFC]'
                "
              />
            </label>

            <div
              v-if="isEditingProfil"
              class="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                :disabled="clientProfilStore.isLoading"
                class="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-bold text-[#334155] transition hover:bg-[#F8FAFC]"
                @click="annulerEditionProfil"
              >
                Annuler
              </button>

              <button
                type="submit"
                :disabled="clientProfilStore.isLoading"
                class="rounded-[10px] bg-[#2F6250] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244B3D] disabled:cursor-not-allowed disabled:bg-[#A8B6AF]"
              >
                {{
                  clientProfilStore.isLoading
                    ? 'Enregistrement...'
                    : 'Enregistrer'
                }}
              </button>
            </div>
          </form>
        </div>

        <!-- COLONNE DROITE -->

        <div class="flex flex-col gap-6">
          <!-- LOCALISATION RÉELLE -->

          <section
            class="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF3ED] text-[#2F6250]"
              >
                <MapPin class="h-5 w-5" />
              </span>

              <div>
                <h2
                  class="text-lg font-extrabold text-[#051F20]"
                >
                  Ma localisation
                </h2>

                <p class="text-sm text-[#64748B]">
                  Votre localisation principale enregistrée.
                </p>
              </div>
            </div>

            <!-- CHARGEMENT -->

            <div
              v-if="localisationLoading"
              class="mt-5 text-sm text-[#64748B]"
            >
              Chargement de votre localisation...
            </div>

            <!-- ERREUR -->

            <div
              v-else-if="localisationErreur"
              class="mt-5 rounded-[8px] bg-[#FFF0EE] p-4 text-sm text-[#C53B35]"
            >
              {{ localisationErreur }}
            </div>

            <!-- DONNÉES RÉELLES -->

            <div
              v-else-if="localisation"
              class="mt-5 space-y-4"
            >
              <div>
                <p
                  class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
                >
                  Adresse
                </p>

                <p
                  class="mt-1 font-semibold text-[#051F20]"
                >
                  {{ localisation.adresse }}
                </p>
              </div>

              <div
                class="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <p
                    class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
                  >
                    Quartier
                  </p>

                  <p
                    class="mt-1 font-semibold text-[#051F20]"
                  >
                    {{ localisation.quartier }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
                  >
                    Ville
                  </p>

                  <p
                    class="mt-1 font-semibold text-[#051F20]"
                  >
                    {{ localisation.ville }}
                  </p>
                </div>
              </div>

              <!-- <div
                class="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <p
                    class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
                  >
                    Latitude
                  </p>

                  <p
                    class="mt-1 font-semibold text-[#051F20]"
                  >
                    {{ localisation.latitude }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs font-bold uppercase tracking-[0.05em] text-[#64748B]"
                  >
                    Longitude
                  </p>

                  <p
                    class="mt-1 font-semibold text-[#051F20]"
                  >
                    {{ localisation.longitude }}
                  </p>
                </div> -->
              <!-- </div> -->

              <div
                v-if="localisation.updated_at"
                class="border-t border-[#F1F5F9] pt-3"
              >
                <p class="text-xs text-[#94A3B8]">
                  Dernière mise à jour :
                  {{
                    formaterDateLocalisation(
                      localisation.updated_at
                    )
                  }}
                </p>
              </div>
            </div>

            <!-- AUCUNE LOCALISATION -->

            <div
              v-else
              class="mt-5 rounded-[8px] border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]"
            >
              Aucune localisation enregistrée.
            </div>
          </section>

          <!-- INFORMATIONS DE LANGUE -->

          <section
            class="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
          >
            <h2
              class="text-lg font-extrabold text-[#051F20]"
            >
              Langue
            </h2>

            <div
              class="mt-5 flex items-center gap-3"
            >
              <span
                class="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF3ED] text-[#2F6250]"
              >
                <Globe2 class="h-5 w-5" />
              </span>

              <div>
                <p
                  class="font-bold text-[#051F20]"
                >
                  Langue de l'application
                </p>

                <p
                  class="text-sm text-[#64748B]"
                >
                  {{ langueActuelle }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <!-- ZONE DE DANGER -->

      <section
        class="flex flex-col gap-4 rounded-[8px] border border-[#FECACA] bg-[#FFF0EE] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#C53B35]"
          >
            <ShieldAlert class="h-5 w-5" />
          </span>

          <span>
            <span
              class="block font-extrabold text-[#C53B35]"
            >
              Zone de danger
            </span>

            <span
              class="block text-sm text-[#C53B35]/80"
            >
              La suppression du compte nécessite une
              action backend dédiée.
            </span>
          </span>
        </div>

        <!--
          Aucun appel DELETE fictif.
          Le bouton est volontairement absent tant que
          l'endpoint réel de suppression n'existe pas.
        -->

        <span
          class="text-sm font-semibold text-[#C53B35]"
        >
          Fonction non disponible
        </span>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.fade-modal-enter-active,
.fade-modal-leave-active {
  transition: opacity 0.2s ease;
}

.fade-modal-enter-from,
.fade-modal-leave-to {
  opacity: 0;
}
</style>