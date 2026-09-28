<script setup>
/**
 * Page profil CLIENT, en grille de cartes premium (photo/nom/rôle,
 * informations personnelles, coordonnées, localisation, notifications,
 * sécurité) — même langage visuel que le reste du CLIENT restylé.
 *
 * Les notifications ne sont plus présentées en popup ici : ce mécanisme
 * existe déjà, réellement, dans ClientNavbar.vue (cloche + panneau
 * déroulant, visible sur toutes les pages). Cette carte affiche un
 * aperçu des notifications réelles, sans dupliquer le popup.
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { Bell, Globe2, Lock, PenLine, ShieldAlert, UserRound } from 'lucide-vue-next'

import PhotoProfil from '@/components/client/PhotoProfil.vue'
import ClientLayout from '@/components/layout/ClientLayout.vue'
import LocationCard from '@/components/profile/LocationCard.vue'

import { useClientProfilStore } from '@/stores/clientProfil'
import { destinationNotification, useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const clientProfilStore = useClientProfilStore()
const notificationsStore = useNotificationsStore()

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
function synchroniserNomComplet() {
  profil.nomComplet = `${profil.firstName} ${profil.lastName}`.trim()
}

// Inverse de synchroniserNomComplet : on répartit le champ unique édité
// par l'utilisateur (nomComplet) en firstName/lastName pour l'envoi à l'API.
function separerNomComplet(nomComplet) {
  const morceaux = nomComplet.trim().split(/\s+/)
  const firstName = morceaux.shift() || ''
  const lastName = morceaux.join(' ')
  return { firstName, lastName }
}

async function chargerProfil() {
  try {
    await clientProfilStore.chargerProfil()
    synchroniserNomComplet()
    messageErreurProfil.value = ''
  } catch (error) {
    console.error('Erreur chargement profil :', error)
    messageErreurProfil.value = 'Impossible de charger vos données. Vérifiez que vous êtes connecté.'
  }
}

function activerEditionProfil() {
  profilAvantEdition = { ...profil }
  isEditingProfil.value = true
}

function annulerEditionProfil() {
  if (profilAvantEdition) {
    Object.assign(profil, profilAvantEdition)
  }
  isEditingProfil.value = false
}

// L'email et le téléphone ne sont jamais envoyés ici : informations de
// compte protégées (voir la carte "Coordonnées" ci-dessous).
async function enregistrerProfil() {
  const noms = separerNomComplet(profil.nomComplet)

  try {
    await clientProfilStore.mettreAJourProfil({
      firstName: noms.firstName,
      lastName: noms.lastName,
    })
    synchroniserNomComplet()
    messageErreurProfil.value = ''
    isEditingProfil.value = false
  } catch (error) {
    console.error('Erreur mise à jour profil :', error)
    messageErreurProfil.value = error.message || 'Impossible de mettre à jour le profil.'
  }
}

async function envoyerPhotoProfil(fichier) {
  try {
    await clientProfilStore.mettreAJourPhoto(fichier)
    messageErreurProfil.value = ''
  } catch (error) {
    console.error('Erreur photo profil :', error)
    messageErreurProfil.value = error.message || "Impossible d'envoyer la photo de profil."
  }
}

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS (aperçu réel, même store que ClientNavbar.vue — pas de
| logique dupliquée, une seule source de vérité)
|--------------------------------------------------------------------------
*/

function formaterDateNotification(date) {
  if (!date) return ''
  const dateFormatee = new Date(date)
  if (Number.isNaN(dateFormatee.getTime())) return ''
  return dateFormatee.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Clic sur une notification de l'aperçu : même comportement que la
 * cloche du header (marquer comme lu, puis rediriger selon le type —
 * jamais un identifiant de ressource précis, absent de l'API actuelle).
 */
async function ouvrirNotification(notification) {
  await notificationsStore.marquerCommeLue(notification.id)
  const destination = destinationNotification(notification)
  if (destination) router.push(destination)
}

/*
|--------------------------------------------------------------------------
| LANGUE
|--------------------------------------------------------------------------
*/

const langueActuelle = ref('Français')

onMounted(() => {
  chargerProfil()
  notificationsStore.chargerNotifications()
})
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <div>
        <p class="font-sans text-xs font-bold uppercase tracking-[0.08em] text-mimosy-primary">Espace client</p>
        <h1 class="mt-1 font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Profil &amp; paramètres</h1>
        <p class="mt-1 font-sans text-sm text-mimosy-secondary sm:text-[15px]">Gardez vos informations à jour pour faciliter vos demandes de service.</p>
        <p v-if="clientProfilStore.isLoading" class="mt-2 font-sans text-sm font-semibold text-mimosy-primary">Synchronisation du profil...</p>
        <p v-if="messageErreurProfil" class="mt-2 font-sans text-sm font-semibold text-[#C53B35]">{{ messageErreurProfil }}</p>
      </div>

      <!-- Carte profil principale -->
      <section class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6 sm:p-8">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <PhotoProfil v-model:photo="profil.photo" :name="profil.nomComplet" :email="profil.email" @selected="envoyerPhotoProfil" />
          </div>
          <button
            v-if="!isEditingProfil"
            type="button"
            :disabled="clientProfilStore.isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-mimosy-primary px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90"
            @click="activerEditionProfil"
          >
            <PenLine class="h-4 w-4" />
            Modifier
          </button>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-mimosy-border pt-6">
          <span class="rounded-full bg-mimosy-primaryBg px-3 py-1 font-sans text-xs font-bold uppercase text-mimosy-primary">{{ profil.role || 'Client' }}</span>
        </div>
      </section>

      <!-- Grille d'informations -->
      <section class="grid gap-6 lg:grid-cols-2">
        <!-- Informations personnelles -->
        <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary"><UserRound class="h-5 w-5" /></span>
            <h2 class="font-sans text-lg font-extrabold text-mimosy-text">Informations personnelles</h2>
          </div>

          <form class="mt-5 flex flex-col gap-2" @submit.prevent="enregistrerProfil">
            <label class="flex flex-col gap-1.5">
              <span class="font-sans text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Nom complet</span>
              <input
                v-model="profil.nomComplet"
                type="text"
                :readonly="!isEditingProfil"
                class="h-12 rounded-xl border border-mimosy-border px-3 font-sans text-sm font-medium text-mimosy-text outline-none transition"
                :class="isEditingProfil ? 'bg-mimosy-surface focus:border-mimosy-primary focus:ring-4 focus:ring-mimosy-primary/10' : 'bg-mimosy-page'"
              />
            </label>

            <div v-if="isEditingProfil" class="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" :disabled="clientProfilStore.isLoading" class="rounded-xl border border-mimosy-border px-5 py-2.5 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page" @click="annulerEditionProfil">
                Annuler
              </button>
              <button type="submit" :disabled="clientProfilStore.isLoading" class="rounded-xl bg-mimosy-primary px-5 py-2.5 font-sans text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {{ clientProfilStore.isLoading ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Coordonnées -->
        <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary"><Lock class="h-5 w-5" /></span>
            <h2 class="font-sans text-lg font-extrabold text-mimosy-text">Coordonnées</h2>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <label class="flex flex-col gap-1.5">
              <span class="font-sans text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Email</span>
              <input :value="profil.email" type="email" readonly disabled class="h-12 cursor-not-allowed rounded-xl border border-mimosy-border bg-mimosy-page px-3 font-sans text-sm font-medium text-mimosy-secondary outline-none" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="font-sans text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Téléphone</span>
              <input :value="profil.telephone ? `${profil.indicatif} ${profil.telephone}` : ''" type="tel" readonly disabled class="h-12 cursor-not-allowed rounded-xl border border-mimosy-border bg-mimosy-page px-3 font-sans text-sm font-medium text-mimosy-secondary outline-none" />
            </label>
            <p class="flex items-start gap-2 rounded-xl bg-mimosy-page p-3 font-sans text-xs leading-5 text-mimosy-secondary">
              <Lock class="mt-0.5 h-4 w-4 shrink-0" />
              Email et téléphone sont des informations de compte protégées : elles ne peuvent pas être modifiées depuis ce formulaire tant qu'aucune procédure de vérification (confirmation par email ou SMS) n'est disponible.
            </p>
          </div>
        </div>

        <!-- Localisation (composant réel existant) -->
        <LocationCard />

        <!-- Notifications non lues (même donnée que la cloche du header) -->
        <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary"><Bell class="h-5 w-5" /></span>
            <h2 class="font-sans text-lg font-extrabold text-mimosy-text">Notifications non lues</h2>
          </div>

          <div class="mt-5">
            <p v-if="notificationsStore.isLoading" class="font-sans text-sm text-mimosy-secondary">Chargement...</p>
            <p v-else-if="notificationsStore.errorMessage" class="font-sans text-sm text-[#C53B35]">{{ notificationsStore.errorMessage }}</p>
            <p v-else-if="!notificationsStore.nonLues.length" class="font-sans text-sm text-mimosy-secondary">Aucune notification pour le moment.</p>
            <ul v-else class="flex flex-col gap-1">
              <li v-for="notification in notificationsStore.nonLues.slice(0, 5)" :key="notification.id">
                <button
                  type="button"
                  class="flex w-full items-start gap-2.5 rounded-xl border-b border-mimosy-border px-1 py-3 text-left transition last:border-b-0 hover:bg-mimosy-page"
                  @click="ouvrirNotification(notification)"
                >
                  <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mimosy-primary" />
                  <span class="min-w-0">
                    <span class="block truncate font-sans text-sm font-semibold text-mimosy-text">{{ notification.titre }}</span>
                    <span class="block font-sans text-[11px] text-mimosy-secondary">{{ formaterDateNotification(notification.date_creation) }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Préférences -->
        <div class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-6">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary"><Globe2 class="h-5 w-5" /></span>
            <h2 class="font-sans text-lg font-extrabold text-mimosy-text">Préférences</h2>
          </div>
          <div class="mt-5">
            <p class="font-sans text-xs font-bold uppercase tracking-[0.05em] text-mimosy-secondary">Langue de l'application</p>
            <p class="mt-1 font-sans text-sm font-bold text-mimosy-text">{{ langueActuelle }}</p>
          </div>
        </div>
      </section>

      <!-- Sécurité / zone de danger -->
      <section class="flex flex-col gap-4 rounded-[24px] border border-[#FECACA] bg-[#FFF0EE] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mimosy-surface text-[#C53B35]"><ShieldAlert class="h-5 w-5" /></span>
          <div>
            <p class="font-sans font-extrabold text-[#C53B35]">Sécurité — Zone de danger</p>
            <p class="font-sans text-sm text-[#C53B35]/80">La suppression du compte nécessite une action backend dédiée.</p>
          </div>
        </div>
        <!-- Aucun appel DELETE fictif : le bouton reste absent tant que l'endpoint réel n'existe pas. -->
        <span class="font-sans text-sm font-semibold text-[#C53B35]">Fonction non disponible</span>
      </section>
    </div>
  </ClientLayout>
</template>
