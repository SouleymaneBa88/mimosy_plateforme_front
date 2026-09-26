<script setup>
/**
 * Modal de paiement d'une demande : le client choisit Wave ou Orange
 * Money, confirme le numéro du compte qui va payer, puis « Continuer ».
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

import { MButton, MInput, MModal } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import * as walletService from '@/services/walletService'

const ouvert = defineModel({ type: Boolean, default: false })

const props = defineProps({
  demande: { type: Object, required: true },
  // Paiement déjà en cours (EN_ATTENTE) : la modal sert alors à le reprendre.
  paiementEnCours: { type: Object, default: null },
})

const emit = defineEmits(['resultat'])

const MOYENS = [
  { valeur: 'WAVE', nom: 'Wave', couleur: '#1DC8F2', aide: 'Vous serez redirigé vers Wave pour valider.' },
  { valeur: 'ORANGE_MONEY', nom: 'Orange Money', couleur: '#FF7900', aide: 'Un QR code et un lien Orange Money / Max it s’afficheront.' },
]

const authStore = useAuthStore()
const moyen = ref('WAVE')
const telephone = ref('')
const envoi = ref(false)
const erreur = ref('')

const montant = computed(() => `${Number(props.demande?.budget || 0).toLocaleString('fr-FR')} FCFA`)
const moyenChoisi = computed(() => MOYENS.find((m) => m.valeur === moyen.value))

// Même règle que le backend (normaliser_telephone_senegal) : retour immédiat
// pour l'utilisateur. Le backend revalide de toute façon.
const telephoneValide = computed(() => {
  const chiffres = telephone.value.replace(/[\s.\-()]/g, '').replace(/^(\+221|00221|221)(?=\d{9}$)/, '')
  return /^7[05678]\d{7}$/.test(chiffres)
})

// À chaque ouverture : moyen déjà choisi pour une reprise, numéro du profil.
watch(ouvert, (estOuvert) => {
  if (!estOuvert) return
  erreur.value = ''
  moyen.value = props.paiementEnCours?.moyen_paiement || 'WAVE'
  telephone.value = telephone.value || authStore.user?.phone || ''
})

async function continuer() {
  if (!telephoneValide.value) {
    erreur.value = 'Numéro invalide : 9 chiffres commençant par 70, 75, 76, 77 ou 78.'
    return
  }
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
  <MModal
    v-model="ouvert"
    :title="paiementEnCours ? 'Reprendre le paiement' : 'Choisir le paiement'"
    :description="`Montant à payer : ${montant}`"
    size="sm"
    :persistent="envoi"
  >
    <div class="flex flex-col gap-5">
      <div class="rounded-xl bg-mimosy-primaryBg px-4 py-3">
        <p class="font-sans text-[11px] font-bold uppercase tracking-[0.4px] text-mimosy-secondary">Montant</p>
        <p class="mt-1 font-serif text-2xl text-mimosy-text">{{ montant }}</p>
        <p class="mt-1 font-sans text-xs text-mimosy-secondary">Calculé par MIMOSY à partir de la demande acceptée.</p>
      </div>

      <fieldset>
        <legend class="font-sans text-sm font-bold text-mimosy-text">Moyen de paiement</legend>
        <div class="mt-3 grid grid-cols-2 gap-3" role="radiogroup">
          <label
            v-for="m in MOYENS"
            :key="m.valeur"
            class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 font-sans text-sm font-bold text-mimosy-text transition"
            :class="moyen === m.valeur ? 'bg-mimosy-surface' : 'border-mimosy-border'"
            :style="moyen === m.valeur ? { borderColor: m.couleur } : {}"
          >
            <input v-model="moyen" type="radio" name="moyen-paiement" :value="m.valeur" class="sr-only" :disabled="envoi" />
            <span class="h-8 w-8 rounded-full" :style="{ background: m.couleur }" aria-hidden="true" />
            {{ m.nom }}
          </label>
        </div>
        <p class="mt-2 font-sans text-xs text-mimosy-secondary">{{ moyenChoisi?.aide }}</p>
      </fieldset>

      <MInput
        v-model="telephone"
        :label="`Numéro ${moyenChoisi?.nom}`"
        type="tel"
        placeholder="77 123 45 67"
        help="Numéro du compte qui va payer (9 chiffres, sans +221)."
        :disabled="envoi"
        required
      />

      <p v-if="erreur" class="rounded-xl bg-[#FFF0EE] px-4 py-3 font-sans text-sm font-semibold text-[#A85148]" role="alert">
        {{ erreur }}
      </p>
    </div>

    <template #footer>
      <MButton variant="secondary" :disabled="envoi" @click="ouvert = false">Fermer</MButton>
      <MButton :loading="envoi" @click="continuer">
        {{ envoi ? 'Préparation du paiement…' : 'Continuer' }}
      </MButton>
    </template>
  </MModal>
</template>
