<script setup>
/**
 * Modal de paiement d'une demande : le client choisit Wave ou Orange
 * Money, confirme le numéro du compte qui va payer, puis valide.
 *
 * Même habillage que les autres popups MIMOSY (components/common/Modal.vue).
 *
 * Ce que ce composant NE fait PAS, volontairement :
 *   - il n'envoie jamais de montant : le backend le lit dans la demande
 *     (le montant affiché ici n'est qu'une information) ;
 *   - il ne décide jamais qu'un paiement a réussi : il redirige vers la
 *     page de paiement renvoyée par le backend (lien Wave, QR code Orange
 *     Money, ou checkout PayDunya en mode test), et c'est le webhook
 *     PayDunya, vérifié côté serveur, qui confirmera ;
 *   - il ne connaît aucune clé PayDunya : il ne parle qu'à l'API MIMOSY.
 *
 * Événement `resultat` : le paiement renvoyé par l'API quand il n'y a pas
 * de redirection (ex. mode sandbox MIMOSY, ou paiement en préparation).
 */
import { computed, ref, watch } from 'vue'
import { Check, Lock, ShieldCheck } from 'lucide-vue-next'

import Modal from '@/components/common/Modal.vue'
import { useAuthStore } from '@/stores/auth'
import * as walletService from '@/services/walletService'

const ouvert = defineModel({ type: Boolean, default: false })

const props = defineProps({
  demande: { type: Object, required: true },
  // Paiement déjà en cours (EN_ATTENTE) : la modal sert alors à le reprendre.
  paiementEnCours: { type: Object, default: null },
  // Nom du prestataire, affiché dans le récapitulatif (facultatif).
  prestataireNom: { type: String, default: '' },
})

const emit = defineEmits(['resultat'])

// Couleurs officielles des deux opérateurs, pour les pastilles uniquement :
// la sélection et les boutons restent au vert MIMOSY.
const MOYENS = [
  { valeur: 'WAVE', nom: 'Wave', initiales: 'W', couleur: '#1DC8F2', aide: 'Vous validerez le paiement dans Wave.' },
  { valeur: 'ORANGE_MONEY', nom: 'Orange Money', initiales: 'OM', couleur: '#FF7900', aide: 'Un QR code et un lien Orange Money / Max it s’afficheront.' },
]

const authStore = useAuthStore()
const moyen = ref('WAVE')
const telephone = ref('')
const envoi = ref(false)
const erreur = ref('')
const numeroTouche = ref(false)

const montant = computed(() => `${Number(props.demande?.budget || 0).toLocaleString('fr-FR')} FCFA`)
const service = computed(() => props.demande?.service_nom || props.demande?.service?.nom || 'Prestation')
const moyenChoisi = computed(() => MOYENS.find((m) => m.valeur === moyen.value))

// Même règle que le backend (normaliser_telephone_senegal) : retour immédiat
// pour l'utilisateur. Le backend revalide de toute façon.
const chiffres = computed(() =>
  telephone.value.replace(/[\s.\-()]/g, '').replace(/^(\+221|00221|221)(?=\d{9}$)/, ''),
)
const telephoneValide = computed(() => /^7[05678]\d{7}$/.test(chiffres.value))
const erreurNumero = computed(() =>
  numeroTouche.value && !telephoneValide.value
    ? '9 chiffres commençant par 70, 75, 76, 77 ou 78.'
    : '',
)

// À chaque ouverture : moyen déjà choisi pour une reprise, numéro du profil.
watch(ouvert, (estOuvert) => {
  if (!estOuvert) return
  erreur.value = ''
  numeroTouche.value = false
  moyen.value = props.paiementEnCours?.moyen_paiement || 'WAVE'
  telephone.value = telephone.value || authStore.user?.phone || ''
})

function fermer() {
  // Pas de fermeture pendant l'envoi : la redirection est peut-être imminente.
  if (!envoi.value) ouvert.value = false
}

async function continuer() {
  numeroTouche.value = true
  if (!telephoneValide.value) return
  envoi.value = true
  erreur.value = ''
  try {
    const paiement = await walletService.payerDemande(props.demande.id, {
      moyen_paiement: moyen.value,
      telephone: telephone.value,
    })
    if (paiement?.statut === 'EN_ATTENTE' && paiement?.url_paiement) {
      // Vraie navigation vers la page de paiement (Wave, Orange Money ou
      // PayDunya) : on quitte MIMOSY, on y reviendra par /client/paiement/retour.
      window.location.href = paiement.url_paiement
      return
    }
    emit('resultat', paiement)
    ouvert.value = false
  } catch (error) {
    // Message du backend, souvent celui de PayDunya (ex. compte non vérifié, numéro refusé).
    erreur.value = error?.message || 'Le paiement n’a pas pu être préparé.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <Modal
    :model-value="ouvert"
    :title="paiementEnCours ? 'Reprendre le paiement' : 'Paiement de la prestation'"
    @update:model-value="fermer"
  >
    <!-- Récapitulatif : montant calculé par MIMOSY -->
    <div class="rounded-[20px] bg-brand-soft p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-brand">Montant à payer</p>
          <p class="mt-1 font-serif text-[32px] leading-10 text-mimosy-text">{{ montant }}</p>
        </div>
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mimosy-surface px-3 py-1.5 font-sans text-xs font-bold text-brand">
          <ShieldCheck :size="14" :stroke-width="2" aria-hidden="true" />
          Sécurisé
        </span>
      </div>
      <p class="mt-3 truncate font-sans text-sm text-mimosy-secondary">
        {{ service }}<span v-if="prestataireNom"> · {{ prestataireNom }}</span>
      </p>
    </div>

    <!-- Moyen de paiement -->
    <fieldset class="mt-6" :disabled="envoi">
      <legend class="font-sans text-sm font-bold text-mimosy-text">Moyen de paiement</legend>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <label
          v-for="m in MOYENS"
          :key="m.valeur"
          class="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-mimosy-surface p-4 transition"
          :class="moyen === m.valeur ? 'border-brand bg-brand-mist' : 'border-mimosy-border hover:border-brand/40'"
        >
          <input v-model="moyen" type="radio" name="moyen-paiement" :value="m.valeur" class="sr-only" />
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-sans text-xs font-extrabold text-white"
            :style="{ background: m.couleur }"
            aria-hidden="true"
          >
            {{ m.initiales }}
          </span>
          <span class="font-sans text-sm font-bold text-mimosy-text">{{ m.nom }}</span>
          <span
            v-if="moyen === m.valeur"
            class="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"
            aria-hidden="true"
          >
            <Check :size="12" :stroke-width="3" />
          </span>
        </label>
      </div>
      <p class="mt-2 font-sans text-xs text-mimosy-secondary">{{ moyenChoisi?.aide }}</p>
    </fieldset>

    <!-- Numéro du compte qui paie -->
    <div class="mt-6">
      <label for="paiement-telephone" class="font-sans text-sm font-bold text-mimosy-text">
        Numéro {{ moyenChoisi?.nom }}
      </label>
      <div
        class="mt-1.5 flex items-center overflow-hidden rounded-xl border bg-mimosy-surface transition focus-within:border-brand"
        :class="erreurNumero ? 'border-[#E7B8B2] bg-[#FFF0EE]' : 'border-mimosy-border'"
      >
        <span class="border-r border-mimosy-border px-3 py-2.5 font-sans text-sm font-bold text-mimosy-secondary">+221</span>
        <input
          id="paiement-telephone"
          v-model="telephone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="77 123 45 67"
          class="w-full bg-transparent px-3 py-2.5 font-sans text-sm text-mimosy-text outline-none"
          :disabled="envoi"
          :aria-invalid="Boolean(erreurNumero)"
          @blur="numeroTouche = true"
        />
      </div>
      <p v-if="erreurNumero" class="mt-1.5 font-sans text-xs font-bold text-[#A85148]">{{ erreurNumero }}</p>
      <p v-else class="mt-1.5 font-sans text-xs text-mimosy-secondary">Le compte {{ moyenChoisi?.nom }} qui va payer.</p>
    </div>

    <p v-if="erreur" class="mt-5 rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm font-semibold text-[#A85148]" role="alert">
      {{ erreur }}
    </p>

    <!-- Actions -->
    <div class="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="rounded-xl border border-mimosy-border px-5 py-3 font-sans text-sm font-bold text-mimosy-text transition hover:bg-mimosy-page disabled:opacity-50"
        :disabled="envoi"
        @click="fermer"
      >
        Annuler
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-sans text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[200px]"
        :disabled="envoi"
        @click="continuer"
      >
        <span v-if="envoi" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
        <Lock v-else :size="15" :stroke-width="2.2" aria-hidden="true" />
        {{ envoi ? 'Préparation du paiement…' : `Payer ${montant}` }}
      </button>
    </div>

    <p class="mt-4 text-center font-sans text-[11px] text-mimosy-secondary">
      Paiement traité par PayDunya. MIMOSY ne voit jamais votre code secret.
    </p>
  </Modal>
</template>
