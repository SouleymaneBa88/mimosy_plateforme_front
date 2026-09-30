<!--
  Page "Mes rendez-vous" du client : liste des rendez-vous pris
  auprès des prestataires, avec la possibilité d'en annuler.
-->
<script setup>
// Outils Vue et icône calendrier.
import { onMounted } from 'vue'
import { CalendarDays } from 'lucide-vue-next'

// La mise en page client, l'état vide et le store des rendez-vous.
import ClientLayout from '@/components/layout/ClientLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useRendezVousStore } from '@/stores/rendezVous'

// Le store qui contient les rendez-vous.
const rdvStore = useRendezVousStore()

// Libellés lisibles des statuts.
const statutLabels = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé',
}

// Couleurs du badge selon le statut.
const statutBadgeClasses = {
  EN_ATTENTE: 'bg-mimosy-yellowBg text-mimosy-yellow',
  CONFIRME: 'bg-mimosy-primaryBg text-mimosy-primary',
  REFUSE: 'bg-[#FFF0EE] text-[#A85148]',
  ANNULE: 'bg-mimosy-grayBg text-mimosy-gray',
  TERMINE: 'bg-mimosy-blueBg text-mimosy-blue',
}

// Renvoie les classes CSS du badge (gris par défaut).
function badgeClass(statut) {
  return statutBadgeClasses[statut] || 'bg-mimosy-grayBg text-mimosy-gray'
}

// Met une date au format "12 mars 2026, 14:30".
function formatDateHeure(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Annule un rendez-vous (l'erreur est déjà affichée par le store).
async function annuler(id) {
  await rdvStore.annuler(id).catch(() => {})
}

// Au montage, on charge les rendez-vous.
onMounted(() => rdvStore.chargerRendezVous().catch(() => {}))
</script>

<template>
  <ClientLayout>
    <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-12">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-serif text-[28px] leading-[34px] text-mimosy-text sm:text-[32px]">Mes rendez-vous</h1>
        <p class="font-sans text-sm text-mimosy-secondary">Suivez vos rendez-vous auprès des prestataires.</p>
      </div>

      <!-- États : chargement, erreur, vide. -->
      <p v-if="rdvStore.isLoading" class="rounded-[24px] border border-mimosy-border bg-mimosy-surface p-8 text-center font-sans text-sm text-mimosy-secondary">
        Chargement de vos rendez-vous...
      </p>
      <p v-else-if="rdvStore.errorMessage" class="rounded-[24px] bg-[#FFF0EE] p-6 text-center font-sans text-sm font-semibold text-[#A85148] sm:p-10">
        {{ rdvStore.errorMessage }}
      </p>

      <EmptyState v-else-if="!rdvStore.rendezVous.length" title="Aucun rendez-vous" message="Vos rendez-vous apparaîtront ici une fois pris depuis le profil d'un prestataire." />

      <!-- Une carte par rendez-vous. -->
      <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <article v-for="rdv in rdvStore.rendezVous" :key="rdv.id" class="flex flex-col gap-3 rounded-[24px] border border-mimosy-border bg-mimosy-surface p-5 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mimosy-primaryBg text-mimosy-primary">
                <CalendarDays class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <h2 class="truncate font-sans text-base font-bold text-mimosy-text">{{ rdv.service_nom || 'Service' }}</h2>
                <p class="mt-0.5 font-sans text-sm text-mimosy-secondary">Prestataire : {{ rdv.prestataire_nom || 'Prestataire' }}</p>
              </div>
            </div>
            <span class="shrink-0 rounded-full px-3 py-1 font-sans text-xs font-bold" :class="badgeClass(rdv.statut)">
              {{ statutLabels[rdv.statut] || rdv.statut }}
            </span>
          </div>

          <p class="font-sans text-sm font-semibold text-mimosy-text">{{ formatDateHeure(rdv.date_heure_debut) }}</p>

          <!-- Bouton "Annuler", seulement si le rendez-vous est en attente ou confirmé. -->
          <button
            v-if="['EN_ATTENTE', 'CONFIRME'].includes(rdv.statut)"
            type="button"
            class="mt-1 self-start rounded-xl border border-[#FBE1DD] bg-mimosy-surface px-4 py-2 font-sans text-sm font-bold text-[#A85148] transition hover:bg-[#FFF0EE] disabled:opacity-50"
            :disabled="rdvStore.isLoading"
            @click="annuler(rdv.id)"
          >
            Annuler
          </button>
        </article>
      </div>
    </div>
  </ClientLayout>
</template>
