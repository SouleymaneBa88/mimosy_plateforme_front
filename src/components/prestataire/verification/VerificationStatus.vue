<script setup>
/**
 * Bloc de statut de vérification affiché sur le profil prestataire.
 *
 * Le statut affiché s'appuie en priorité sur le document "pièce
 * d'identité" (seul document analysé automatiquement, voir
 * apps.verification.services côté backend) : son statut détaillé et
 * son score de correspondance permettent de distinguer une
 * vérification simplement en attente d'un administrateur d'une
 * vérification dont certains champs ne correspondent pas au profil et
 * mérite un examen plus attentif. Le statut global du profil
 * (`statutVerification`, EN_ATTENTE/VERIFIE/REJETE) sert de valeur de
 * repli tant que ce document n'a pas encore été chargé.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, AlertTriangle } from 'lucide-vue-next'

import * as verificationService from '@/services/verificationService'
import { SEUIL_CORRESPONDANCE } from '@/utils/verification'

const props = defineProps({
  statutVerification: {
    type: String,
    default: '',
  },
})

const document = ref(null)
const chargementDocument = ref(true)

onMounted(async () => {
  try {
    document.value = await verificationService.getMonDocument('PIECE_IDENTITE')
  } catch {
    // Le repli sur le statut du profil (voir `etat` ci-dessous) suffit
    // à afficher un état correct même si cet appel échoue.
  } finally {
    chargementDocument.value = false
  }
})

/**
 * Cinq états possibles, dérivés uniquement de données réelles :
 * - le document n'existe pas encore ou n'a jamais été soumis ;
 * - EN_ANALYSE, ou A_VERIFIER avec un bon score : en attente d'un admin ;
 * - A_VERIFIER avec un score sous le seuil : mérite un second regard ;
 * - VALIDE ou REJETE : décision administrative déjà prise.
 */
const etat = computed(() => {
  const statutDocument = document.value?.statut

  if (statutDocument === 'VALIDE') return 'verifiee'
  if (statutDocument === 'REJETE') return 'refusee'

  if (statutDocument === 'A_VERIFIER') {
    const score = document.value?.score_correspondance
    return score != null && score < SEUIL_CORRESPONDANCE ? 'a_revoir' : 'en_cours'
  }

  if (statutDocument === 'EN_ANALYSE') return 'en_cours'

  // Aucun document chargé (soit vraiment NON_SOUMIS, soit l'appel a
  // échoué) : on retombe sur le statut global du profil.
  if (props.statutVerification === 'VERIFIE') return 'verifiee'
  if (props.statutVerification === 'REJETE') return 'refusee'
  return 'requise'
})

const contenu = computed(() => ({
  requise: {
    icone: ShieldQuestion,
    couleur: 'text-[#7A847E]',
    fond: 'bg-[#F2F3F0]',
    titre: 'Vérification requise',
    description: "Votre identité n'a pas encore été vérifiée.",
    actionLabel: 'Vérifier mon identité',
  },
  en_cours: {
    icone: Clock,
    couleur: 'text-[#9A723C]',
    fond: 'bg-[#FFF7E6]',
    titre: 'Vérification en cours',
    description: 'Votre pièce est actuellement analysée. Vous serez informé lorsque la vérification sera terminée.',
    actionLabel: 'Suivre ma vérification',
  },
  a_revoir: {
    icone: AlertTriangle,
    couleur: 'text-[#9A723C]',
    fond: 'bg-[#FFF7E6]',
    titre: 'Vérification à revoir',
    description: 'Certaines informations nécessitent une vérification complémentaire.',
    actionLabel: 'Voir le résultat',
  },
  verifiee: {
    icone: ShieldCheck,
    couleur: 'text-[#2D6A4F]',
    fond: 'bg-[#EAF8F2]',
    titre: 'Identité vérifiée',
    description: 'Votre identité a été vérifiée par MIMOSY.',
    actionLabel: 'Voir les informations',
  },
  refusee: {
    icone: ShieldAlert,
    couleur: 'text-[#A85148]',
    fond: 'bg-[#FFF0EE]',
    titre: 'Vérification refusée',
    description: "La vérification n'a pas été validée.",
    actionLabel: 'Voir le motif',
  },
}[etat.value]))
</script>

<template>
  <section class="border border-[#E5E7E2] bg-white p-6 sm:p-8">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-4">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          :class="contenu.fond"
        >
          <component :is="contenu.icone" class="h-5 w-5" :class="contenu.couleur" :stroke-width="2" />
        </span>

        <div>
          <h2 class="text-lg font-semibold text-[#1A1C1A]">
            {{ contenu.titre }}
          </h2>

          <p class="mt-1 max-w-2xl text-sm leading-6 text-[#5F6B64]">
            {{ contenu.description }}
          </p>
        </div>
      </div>

      <RouterLink
        v-if="!chargementDocument"
        to="/prestataire/verification"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#24573F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
      >
        {{ contenu.actionLabel }}
      </RouterLink>
    </div>
  </section>
</template>
